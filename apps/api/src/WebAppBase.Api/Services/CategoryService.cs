using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Manages the admin-configured category hierarchy.
/// </summary>
public sealed class CategoryService(
    ICategoryRepository categoryRepository,
    IAuditService auditService,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetAllAsync(cancellationToken);

        return [.. categories.Select(MapResponse)];
    }

    public async Task<IReadOnlyList<CategoryTreeNodeResponse>> GetTreeAsync(CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetAllAsync(cancellationToken);

        return BuildTree(categories);
    }

    public async Task<Result<CategoryResponse>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.GetByIdAsync(id, cancellationToken);

        return category is null
            ? Result<CategoryResponse>.Failure(CategoryNotFound())
            : Result<CategoryResponse>.Success(MapResponse(category));
    }

    public async Task<Result<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        if (await categoryRepository.SlugExistsAsync(request.Slug, null, cancellationToken))
        {
            return Result<CategoryResponse>.Failure(SlugAlreadyUsed());
        }

        if (request.ParentCategoryId is not null)
        {
            var parent = await categoryRepository.GetByIdAsync(request.ParentCategoryId.Value, cancellationToken);
            if (parent is null)
            {
                return Result<CategoryResponse>.Failure(ParentNotFound());
            }
        }

        var category = new Category
        {
            ParentCategoryId = request.ParentCategoryId,
            Name = request.Name,
            Slug = request.Slug,
            Colour = request.Colour,
            Icon = request.Icon,
            SortOrder = request.SortOrder,
            Visibility = request.Visibility,
            VisibleToRoles = [.. request.VisibleToRoles],
            CreatedAt = clock.UtcNow
        };

        categoryRepository.Add(category);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        auditService.Record(EntityTypeNames.Category, category.Id, AuditAction.Created, null, MapResponse(category));
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(MapResponse(category));
    }

    public async Task<Result<CategoryResponse>> UpdateAsync(
        long id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result<CategoryResponse>.Failure(CategoryNotFound());
        }

        if (await categoryRepository.SlugExistsAsync(request.Slug, id, cancellationToken))
        {
            return Result<CategoryResponse>.Failure(SlugAlreadyUsed());
        }

        var parentError = await ValidateParentAsync(id, request.ParentCategoryId, cancellationToken);
        if (parentError is not null)
        {
            return Result<CategoryResponse>.Failure(parentError);
        }

        var previousState = MapResponse(category);

        category.ParentCategoryId = request.ParentCategoryId;
        category.Name = request.Name;
        category.Slug = request.Slug;
        category.Colour = request.Colour;
        category.Icon = request.Icon;
        category.SortOrder = request.SortOrder;
        category.Visibility = request.Visibility;
        category.VisibleToRoles = [.. request.VisibleToRoles];
        category.UpdatedAt = clock.UtcNow;

        auditService.Record(
            EntityTypeNames.Category,
            category.Id,
            AuditAction.Updated,
            previousState,
            MapResponse(category));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CategoryResponse>.Success(MapResponse(category));
    }

    public async Task<Result> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result.Failure(CategoryNotFound());
        }

        // Refuse rather than cascade: removing a section should never silently take
        // its children or their content with it.
        if (await categoryRepository.HasChildCategoriesAsync(id, cancellationToken))
        {
            return Result.Failure(Error.Conflict(
                ErrorCodes.CategoryHasChildren,
                "Hierdie kategorie het subkategorieë. Skuif of verwyder hulle eers."));
        }

        if (await categoryRepository.HasContentAsync(id, cancellationToken))
        {
            return Result.Failure(Error.Conflict(
                ErrorCodes.CategoryHasChildren,
                "Hierdie kategorie bevat inhoud. Skuif of verwyder die inhoud eers."));
        }

        var previousState = MapResponse(category);

        category.IsDeleted = true;
        category.UpdatedAt = clock.UtcNow;

        auditService.Record(EntityTypeNames.Category, category.Id, AuditAction.Deleted, previousState, null);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error CategoryNotFound() => Error.NotFound(
        ErrorCodes.CategoryNotFound,
        "Die kategorie kon nie gevind word nie.");

    private static Error SlugAlreadyUsed() => Error.Conflict(
        ErrorCodes.SlugAlreadyUsed,
        "Hierdie skakelnaam word reeds gebruik.");

    private static Error ParentNotFound() => Error.Validation(
        ErrorCodes.ParentCategoryNotFound,
        "Die gekose moederkategorie kon nie gevind word nie.");

    /// <summary>
    /// Rejects a parent that would make the hierarchy cyclic — either the category
    /// itself, or one of its own descendants. A cycle would make tree building
    /// recurse forever.
    /// </summary>
    private async Task<Error?> ValidateParentAsync(
        long categoryId,
        long? parentCategoryId,
        CancellationToken cancellationToken)
    {
        if (parentCategoryId is null)
        {
            return null;
        }

        if (parentCategoryId == categoryId)
        {
            return Error.Validation(
                ErrorCodes.CategoryCycle,
                "'n Kategorie kan nie sy eie moederkategorie wees nie.");
        }

        var parent = await categoryRepository.GetByIdAsync(parentCategoryId.Value, cancellationToken);
        if (parent is null)
        {
            return ParentNotFound();
        }

        var allCategories = await categoryRepository.GetAllAsync(cancellationToken);

        return WouldCreateCycle(allCategories, categoryId, parentCategoryId.Value)
            ? Error.Validation(
                ErrorCodes.CategoryCycle,
                "Hierdie skuif sal 'n kringloop in die kategoriestruktuur skep.")
            : null;
    }

    private static bool WouldCreateCycle(
        IReadOnlyList<Category> allCategories,
        long categoryId,
        long proposedParentId)
    {
        var parentLookup = allCategories.ToDictionary(
            category => category.Id,
            category => category.ParentCategoryId);

        var currentId = (long?)proposedParentId;
        var visited = new HashSet<long>();

        while (currentId is not null)
        {
            if (currentId == categoryId)
            {
                return true;
            }

            // Guards against a pre-existing cycle in the data rather than the proposed move.
            if (!visited.Add(currentId.Value) || !parentLookup.TryGetValue(currentId.Value, out var nextId))
            {
                return false;
            }

            currentId = nextId;
        }

        return false;
    }

    private static IReadOnlyList<CategoryTreeNodeResponse> BuildTree(IReadOnlyList<Category> categories)
    {
        var childrenByParent = categories
            .GroupBy(category => category.ParentCategoryId)
            .ToDictionary(group => group.Key ?? 0L, group => group.ToList());

        return BuildBranch(childrenByParent, 0L);
    }

    private static IReadOnlyList<CategoryTreeNodeResponse> BuildBranch(
        Dictionary<long, List<Category>> childrenByParent,
        long parentId)
    {
        if (!childrenByParent.TryGetValue(parentId, out var children))
        {
            return [];
        }

        return
        [
            .. children
                .OrderBy(category => category.SortOrder)
                .ThenBy(category => category.Name)
                .Select(category => new CategoryTreeNodeResponse(
                    category.Id,
                    category.ParentCategoryId,
                    category.Name,
                    category.Slug,
                    category.Colour,
                    category.Icon,
                    category.SortOrder,
                    BuildBranch(childrenByParent, category.Id)))
        ];
    }

    private static CategoryResponse MapResponse(Category category) => new(
        category.Id,
        category.ParentCategoryId,
        category.Name,
        category.Slug,
        category.Colour,
        category.Icon,
        category.SortOrder,
        category.Visibility,
        category.VisibleToRoles,
        category.CreatedAt,
        category.UpdatedAt);
}
