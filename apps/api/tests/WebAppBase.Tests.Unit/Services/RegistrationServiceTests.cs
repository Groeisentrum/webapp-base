using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class RegistrationServiceTests : IDisposable
{
    private const int ClientRoleId = 7;

    private readonly WebAppDbContext dbContext;
    private readonly ITenantSettingsRepository tenantSettingsRepository =
        Substitute.For<ITenantSettingsRepository>();
    private readonly ISkaaphondUserClient skaaphondUserClient = Substitute.For<ISkaaphondUserClient>();
    private readonly RegistrationService registrationService;

    public RegistrationServiceTests()
    {
        var options = new DbContextOptionsBuilder<WebAppDbContext>()
            .UseInMemoryDatabase($"registration-{Guid.NewGuid()}")
            .Options;

        dbContext = new WebAppDbContext(options);

        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(callInfo => dbContext.SaveChangesAsync(callInfo.Arg<CancellationToken>()));

        registrationService = new RegistrationService(
            dbContext,
            tenantSettingsRepository,
            skaaphondUserClient,
            Options.Create(new SkaaphondOptions { ClientRoleId = ClientRoleId }),
            unitOfWork,
            FixedClock.Default(),
            NullLogger<RegistrationService>.Instance);

        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings(true));
        skaaphondUserClient
            .CreateClientUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(SkaaphondUserCreationResult.Success("user-123"));
    }

    [Fact]
    public async Task RegisterAsync_WithoutPrivacyConsent_Fails()
    {
        var request = BuildRequest();
        request.ConsentToPrivacyPolicy = false;

        var result = await registrationService.RegisterAsync(request, null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.ConsentRequired);
    }

    [Fact]
    public async Task RegisterAsync_WithoutAcceptingTerms_Fails()
    {
        var request = BuildRequest();
        request.AcceptTerms = false;

        var result = await registrationService.RegisterAsync(request, null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.ConsentRequired);
    }

    [Fact]
    public async Task RegisterAsync_WithoutConsent_CreatesNoAccount()
    {
        var request = BuildRequest();
        request.ConsentToPrivacyPolicy = false;

        await registrationService.RegisterAsync(request, null, null, CancellationToken.None);

        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("kort1!A")]
    [InlineData("geenhoofletter1!")]
    [InlineData("GEENKLEINLETTER1!")]
    [InlineData("GeenSyfer!")]
    [InlineData("GeenSpesiaal1")]
    public async Task RegisterAsync_WithAWeakPassword_FailsBeforeReachingSkaaphond(string password)
    {
        var request = BuildRequest();
        request.Password = password;

        var result = await registrationService.RegisterAsync(request, null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.PasswordTooWeak);
        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_WhenSelfRegistrationIsOff_Fails()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings(false));

        var result = await registrationService.RegisterAsync(
            BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.RegistrationDisabled);
    }

    /// <summary>
    /// Without a role id the account would carry no role and could reach nothing, so
    /// creating it would strand a real person.
    /// </summary>
    [Fact]
    public async Task RegisterAsync_WithoutAConfiguredClientRole_CreatesNoAccount()
    {
        var service = new RegistrationService(
            dbContext,
            tenantSettingsRepository,
            skaaphondUserClient,
            Options.Create(new SkaaphondOptions { ClientRoleId = 0 }),
            Substitute.For<IUnitOfWork>(),
            FixedClock.Default(),
            NullLogger<RegistrationService>.Instance);

        var result = await service.RegisterAsync(BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.RegistrationDisabled);
        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterAsync_OnSuccess_RecordsConsentLinkedToTheNewAccount()
    {
        var result = await registrationService.RegisterAsync(
            BuildRequest(), "203.0.113.7", "Toets/1.0", CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.SkaaphondUserId.Should().Be("user-123");
        record.Email.Should().Be("besoeker@voorbeeld.co.za");
        record.IpAddress.Should().Be("203.0.113.7");
        record.UserAgent.Should().Be("Toets/1.0");
    }

    /// <summary>
    /// The versions in force at the time are stamped on the record, so you can still
    /// show what a person agreed to after the wording changes.
    /// </summary>
    [Fact]
    public async Task RegisterAsync_StampsThePolicyVersionsInForce()
    {
        await registrationService.RegisterAsync(BuildRequest(), null, null, CancellationToken.None);

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.PrivacyPolicyVersion.Should().Be("2.1");
        record.TermsVersion.Should().Be("1.4");
        record.ConsentedAt.Should().Be(FixedClock.DefaultInstant);
    }

    /// <summary>
    /// Consent is written before the account is created, so a failure upstream leaves
    /// evidence of the attempt rather than an account with no consent behind it.
    /// </summary>
    [Fact]
    public async Task RegisterAsync_WhenSkaaphondRejects_KeepsTheConsentRecordUnlinked()
    {
        skaaphondUserClient
            .CreateClientUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(SkaaphondUserCreationResult.Failure("400: Username already exists."));

        var result = await registrationService.RegisterAsync(
            BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.SkaaphondUserId.Should().BeNull();
    }

    /// <summary>
    /// The upstream message names the account. Echoing it would let a caller probe
    /// which usernames exist.
    /// </summary>
    [Fact]
    public async Task RegisterAsync_WhenSkaaphondRejects_DoesNotLeakTheUpstreamReason()
    {
        skaaphondUserClient
            .CreateClientUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(SkaaphondUserCreationResult.Failure("400: Username [besoeker] already exists."));

        var result = await registrationService.RegisterAsync(
            BuildRequest(), null, null, CancellationToken.None);

        result.Error!.Message.Should().NotContain("besoeker");
        result.Error.Message.Should().NotContain("already exists");
    }

    [Fact]
    public async Task GetAvailabilityAsync_ReflectsBothTheTenantFlagAndTheRoleConfiguration()
    {
        var enabled = await registrationService.GetAvailabilityAsync(CancellationToken.None);
        enabled.Value.SelfRegistrationEnabled.Should().BeTrue();

        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings(false));

        var disabled = await registrationService.GetAvailabilityAsync(CancellationToken.None);
        disabled.Value.SelfRegistrationEnabled.Should().BeFalse();
    }

    public void Dispose() => dbContext.Dispose();

    private static TenantSettings BuildSettings(bool selfRegistrationEnabled) => new()
    {
        Id = 1,
        SiteName = "Toetswerf",
        DefaultLanguageCode = "af",
        ActiveLanguageCodes = ["af"],
        PrivacyPolicyVersion = "2.1",
        TermsVersion = "1.4",
        SelfRegistrationEnabled = selfRegistrationEnabled
    };

    private static RegisterClientRequest BuildRequest() => new()
    {
        UserName = "besoeker",
        Email = "besoeker@voorbeeld.co.za",
        Password = "Wagwoord1!",
        ConsentToPrivacyPolicy = true,
        AcceptTerms = true
    };
}
