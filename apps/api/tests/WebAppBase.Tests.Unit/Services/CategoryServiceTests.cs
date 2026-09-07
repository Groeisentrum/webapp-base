using NSubstitute;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class CategoryServiceTests
{
    private readonly ICategoryRepository categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IAuditService auditService = Substitute.For<IAuditService>();
    private readonly IUnitOfWork unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly CategoryService categoryService;

    public CategoryServiceTests() =>
        categoryService = new CategoryService(categoryRepository, auditService, unitOfWork, FixedClock.Default());

    [Fact]
    public async Task CreateAsync_WithDuplicateSlug_Fails()
    {
        categoryRepository.SlugExistsAsync("besoek", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await categoryService.CreateAsync(BuildCreateRequest(slug: "besoek"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.SlugAlreadyUsed);
        result.Error.Kind.Should().Be(ErrorKind.Conflict);
    }

    [Fact]
    public async Task CreateAsync_WithMissingParent_Fails()
    {
        categoryRepository.SlugExistsAsync(Arg.Any<string>(), null, Arg.Any<CancellationToken>()).Returns(false);
        categoryRepository.GetByIdAsync(99, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var request = BuildCreateRequest();
        request.ParentCategoryId = 99;

        var result = await categoryService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.ParentCategoryNotFound);
    }

    [Fact]
    public async Task CreateAsync_WithValidRequest_AddsAndAudits()
    {
        categoryRepository.SlugExistsAsync(Arg.Any<string>(), null, Arg.Any<CancellationToken>()).Returns(false);

        var result = await categoryService.CreateAsync(BuildCreateRequest(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        categoryRepository.Received(1).Add(Arg.Any<Category>());
        auditService.Received(1).Record(
            EntityTypeNames.Category,
            Arg.Any<long>(),
            AuditAction.Created,
            Arg.Is<object?>(oldValues => oldValues == null),
            Arg.Is<object?>(newValues => newValues != null));
    }

    [Fact]
    public async Task UpdateAsync_SettingItselfAsParent_Fails()
    {
        var category = BuildCategory(id: 1);
        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(category);
        categoryRepository.SlugExistsAsync(Arg.Any<string>(), 1, Arg.Any<CancellationToken>()).Returns(false);

        var request = BuildUpdateRequest();
        request.ParentCategoryId = 1;

        var result = await categoryService.UpdateAsync(1, request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.CategoryCycle);
    }

    [Fact]
    public async Task UpdateAsync_MovingUnderItsOwnDescendant_Fails()
    {
        // 1 -> 2 -> 3. Moving 1 under 3 would close the loop.
        var root = BuildCategory(id: 1);
        var child = BuildCategory(id: 2, parentId: 1);
        var grandchild = BuildCategory(id: 3, parentId: 2);

        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(root);
        categoryRepository.GetByIdAsync(3, Arg.Any<CancellationToken>()).Returns(grandchild);
        categoryRepository.SlugExistsAsync(Arg.Any<string>(), 1, Arg.Any<CancellationToken>()).Returns(false);
        categoryRepository.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<Category>>([root, child, grandchild]);

        var request = BuildUpdateRequest();
        request.ParentCategoryId = 3;

        var result = await categoryService.UpdateAsync(1, request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.CategoryCycle);
    }

    [Fact]
    public async Task UpdateAsync_MovingUnderAnUnrelatedCategory_Succeeds()
    {
        var moving = BuildCategory(id: 1);
        var target = BuildCategory(id: 5);

        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(moving);
        categoryRepository.GetByIdAsync(5, Arg.Any<CancellationToken>()).Returns(target);
        categoryRepository.SlugExistsAsync(Arg.Any<string>(), 1, Arg.Any<CancellationToken>()).Returns(false);
        categoryRepository.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<Category>>([moving, target]);

        var request = BuildUpdateRequest();
        request.ParentCategoryId = 5;

        var result = await categoryService.UpdateAsync(1, request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.ParentCategoryId.Should().Be(5);
    }

    [Fact]
    public async Task DeleteAsync_WithChildCategories_Fails()
    {
        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(BuildCategory(id: 1));
        categoryRepository.HasChildCategoriesAsync(1, Arg.Any<CancellationToken>()).Returns(true);

        var result = await categoryService.DeleteAsync(1, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Conflict);
    }

    [Fact]
    public async Task DeleteAsync_WithContent_Fails()
    {
        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(BuildCategory(id: 1));
        categoryRepository.HasChildCategoriesAsync(1, Arg.Any<CancellationToken>()).Returns(false);
        categoryRepository.HasContentAsync(1, Arg.Any<CancellationToken>()).Returns(true);

        var result = await categoryService.DeleteAsync(1, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Conflict);
    }

    [Fact]
    public async Task DeleteAsync_WhenEmpty_SoftDeletes()
    {
        var category = BuildCategory(id: 1);
        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(category);
        categoryRepository.HasChildCategoriesAsync(1, Arg.Any<CancellationToken>()).Returns(false);
        categoryRepository.HasContentAsync(1, Arg.Any<CancellationToken>()).Returns(false);

        var result = await categoryService.DeleteAsync(1, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        category.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task GetTreeAsync_NestsChildrenUnderParents()
    {
        var root = BuildCategory(id: 1, name: "Besoek");
        var child = BuildCategory(id: 2, parentId: 1, name: "Geleide Toere");
        categoryRepository.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<Category>>([root, child]);

        var tree = await categoryService.GetTreeAsync(CancellationToken.None);

        tree.Should().HaveCount(1);
        tree[0].Name.Should().Be("Besoek");
        tree[0].Children.Should().HaveCount(1);
        tree[0].Children[0].Name.Should().Be("Geleide Toere");
    }

    [Fact]
    public async Task GetTreeAsync_OrdersSiblingsBySortOrder()
    {
        var second = BuildCategory(id: 1, name: "B");
        second.SortOrder = 2;
        var first = BuildCategory(id: 2, name: "A");
        first.SortOrder = 1;

        categoryRepository.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<Category>>([second, first]);

        var tree = await categoryService.GetTreeAsync(CancellationToken.None);

        tree.Select(node => node.Name).Should().ContainInOrder("A", "B");
    }

    private static Category BuildCategory(long id, long? parentId = null, string name = "Kategorie") => new()
    {
        Id = id,
        ParentCategoryId = parentId,
        Name = name,
        Slug = $"kategorie-{id}"
    };

    private static CreateCategoryRequest BuildCreateRequest(string slug = "nuwe-kategorie") => new()
    {
        Name = "Nuwe Kategorie",
        Slug = slug
    };

    private static UpdateCategoryRequest BuildUpdateRequest(string slug = "opgedateer") => new()
    {
        Name = "Opgedateer",
        Slug = slug
    };
}
