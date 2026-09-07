using NSubstitute;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class TenantSettingsServiceTests
{
    private readonly ITenantSettingsRepository tenantSettingsRepository =
        Substitute.For<ITenantSettingsRepository>();

    private readonly IAuditService auditService = Substitute.For<IAuditService>();
    private readonly INotificationService notificationService = Substitute.For<INotificationService>();
    private readonly IUnitOfWork unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TenantSettingsService tenantSettingsService;

    public TenantSettingsServiceTests() =>
        tenantSettingsService = new TenantSettingsService(
            tenantSettingsRepository,
            auditService,
            notificationService,
            unitOfWork,
            FixedClock.Default());

    [Fact]
    public async Task GetAsync_BeforeSeeding_ReportsNotInitialised()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns((TenantSettings?)null);

        var result = await tenantSettingsService.GetAsync(CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.TenantSettingsNotInitialised);
    }

    [Fact]
    public async Task UpdateAsync_WithDefaultLanguageOutsideActiveList_Fails()
    {
        var request = BuildRequest();
        request.DefaultLanguageCode = "zu";
        request.ActiveLanguageCodes = ["af", "en"];

        var result = await tenantSettingsService.UpdateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.UnsupportedLanguage);
    }

    [Fact]
    public async Task UpdateAsync_WithNoActiveLanguages_Fails()
    {
        var request = BuildRequest();
        request.ActiveLanguageCodes = [];

        var result = await tenantSettingsService.UpdateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.UnsupportedLanguage);
    }

    [Fact]
    public async Task UpdateAsync_OnFirstRun_CreatesTheSettingsRow()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns((TenantSettings?)null);

        var result = await tenantSettingsService.UpdateAsync(BuildRequest(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        tenantSettingsRepository.Received(1).Add(Arg.Any<TenantSettings>());
    }

    [Fact]
    public async Task UpdateAsync_WhenAlreadySeeded_UpdatesInPlace()
    {
        var existing = new TenantSettings
        {
            Id = 1,
            SiteName = "Oud",
            DefaultLanguageCode = "af",
            ActiveLanguageCodes = ["af"]
        };
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(existing);

        var request = BuildRequest();
        request.SiteName = "Nuut";

        var result = await tenantSettingsService.UpdateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.SiteName.Should().Be("Nuut");
        tenantSettingsRepository.DidNotReceive().Add(Arg.Any<TenantSettings>());
    }

    [Fact]
    public async Task UpdateAsync_PreservesClientDefinedFeatureFlags()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns((TenantSettings?)null);

        var request = BuildRequest();
        request.FeatureFlags = new Dictionary<string, bool>
        {
            [FeatureFlagNames.VirtualTour] = true,
            ["clientSpecificModule"] = true
        };

        var result = await tenantSettingsService.UpdateAsync(request, CancellationToken.None);

        result.Value.FeatureFlags.Should().ContainKey("clientSpecificModule");
        result.Value.FeatureFlags[FeatureFlagNames.VirtualTour].Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_NotifiesThatConfigurationChanged()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns((TenantSettings?)null);

        await tenantSettingsService.UpdateAsync(BuildRequest(), CancellationToken.None);

        notificationService.Received(1).Queue(NotificationTypes.TenantSettingsChanged, null);
    }

    [Fact]
    public async Task GetPublicConfigAsync_ReturnsTheRenderingConfiguration()
    {
        var existing = new TenantSettings
        {
            Id = 1,
            SiteName = "VTM",
            DefaultLanguageCode = "af",
            ActiveLanguageCodes = ["af", "en"]
        };
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(existing);

        var result = await tenantSettingsService.GetPublicConfigAsync(CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.SiteName.Should().Be("VTM");
        result.Value.ActiveLanguageCodes.Should().BeEquivalentTo(["af", "en"]);
    }

    private static UpdateTenantSettingsRequest BuildRequest() => new()
    {
        SiteName = "Toetswerf",
        DefaultLanguageCode = "af",
        ActiveLanguageCodes = ["af", "en"]
    };
}
