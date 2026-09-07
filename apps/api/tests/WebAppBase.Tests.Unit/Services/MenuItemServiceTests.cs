using NSubstitute;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class MenuItemServiceTests
{
    private readonly IMenuItemRepository menuItemRepository = Substitute.For<IMenuItemRepository>();
    private readonly ICategoryRepository categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IAuditService auditService = Substitute.For<IAuditService>();
    private readonly IUnitOfWork unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly MenuItemService menuItemService;

    public MenuItemServiceTests() =>
        menuItemService = new MenuItemService(
            menuItemRepository,
            categoryRepository,
            auditService,
            unitOfWork,
            FixedClock.Default());

    [Fact]
    public async Task CreateAsync_CategoryLinkWithoutCategory_Fails()
    {
        var request = BuildCreateRequest(MenuLinkType.Category);

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidMenuTarget);
    }

    [Fact]
    public async Task CreateAsync_CategoryLinkWithMissingCategory_Fails()
    {
        categoryRepository.GetByIdAsync(42, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var request = BuildCreateRequest(MenuLinkType.Category);
        request.CategoryId = 42;

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidMenuTarget);
    }

    [Fact]
    public async Task CreateAsync_CategoryLinkWithExistingCategory_Succeeds()
    {
        categoryRepository.GetByIdAsync(1, Arg.Any<CancellationToken>())
            .Returns(new Category { Id = 1, Name = "Besoek", Slug = "besoek" });

        var request = BuildCreateRequest(MenuLinkType.Category);
        request.CategoryId = 1;

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        menuItemRepository.Received(1).Add(Arg.Any<MenuItem>());
    }

    [Fact]
    public async Task CreateAsync_StaticPageLinkWithoutSlug_Fails()
    {
        var result = await menuItemService.CreateAsync(
            BuildCreateRequest(MenuLinkType.StaticPage),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidMenuTarget);
    }

    [Fact]
    public async Task CreateAsync_StaticPageLinkWithSlug_Succeeds()
    {
        var request = BuildCreateRequest(MenuLinkType.StaticPage);
        request.StaticPageSlug = "privaatheidsbeleid";

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("javascript:alert(1)")]
    [InlineData("ftp://example.com")]
    [InlineData("")]
    public async Task CreateAsync_ExternalLinkWithNonHttpTarget_Fails(string externalUrl)
    {
        var request = BuildCreateRequest(MenuLinkType.ExternalLink);
        request.ExternalUrl = externalUrl;

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidMenuTarget);
    }

    [Theory]
    [InlineData("https://example.com")]
    [InlineData("http://example.com/pad")]
    public async Task CreateAsync_ExternalLinkWithHttpTarget_Succeeds(string externalUrl)
    {
        var request = BuildCreateRequest(MenuLinkType.ExternalLink);
        request.ExternalUrl = externalUrl;

        var result = await menuItemService.CreateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_WithChildItems_Fails()
    {
        menuItemRepository.GetByIdAsync(1, Arg.Any<CancellationToken>())
            .Returns(new MenuItem { Id = 1, Label = "Besoek" });
        menuItemRepository.HasChildMenuItemsAsync(1, Arg.Any<CancellationToken>()).Returns(true);

        var result = await menuItemService.DeleteAsync(1, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Conflict);
    }

    [Fact]
    public async Task UpdateAsync_SettingItselfAsParent_Fails()
    {
        menuItemRepository.GetByIdAsync(1, Arg.Any<CancellationToken>())
            .Returns(new MenuItem { Id = 1, Label = "Besoek" });

        var request = new UpdateMenuItemRequest
        {
            MenuType = MenuType.Top,
            LinkType = MenuLinkType.StaticPage,
            Label = "Besoek",
            StaticPageSlug = "besoek",
            ParentMenuItemId = 1
        };

        var result = await menuItemService.UpdateAsync(1, request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidMenuTarget);
    }

    private static CreateMenuItemRequest BuildCreateRequest(MenuLinkType linkType) => new()
    {
        MenuType = MenuType.Top,
        LinkType = linkType,
        Label = "Besoek"
    };
}
