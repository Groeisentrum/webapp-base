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
    private const string PendingId = "pending-abc";

    private readonly WebAppDbContext dbContext;
    private readonly ITenantSettingsRepository tenantSettingsRepository =
        Substitute.For<ITenantSettingsRepository>();
    private readonly ISkaaphondUserClient skaaphondUserClient = Substitute.For<ISkaaphondUserClient>();
    private readonly ISkaaphondOtpClient skaaphondOtpClient = Substitute.For<ISkaaphondOtpClient>();
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

        registrationService = BuildService(unitOfWork, ClientRoleId);

        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings(true));

        skaaphondOtpClient.SendAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(OtpSendOutcome.Success(PendingId, DateTimeOffset.UtcNow.AddMinutes(10), "b***@v***.co.za"));
        skaaphondOtpClient.VerifyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(OtpVerifyOutcome.Success());
        skaaphondUserClient
            .CreateClientUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(SkaaphondUserCreationResult.Success("user-123"));
    }

    // ---- Step one: consent and code ----------------------------------------

    [Fact]
    public async Task StartAsync_WithoutPrivacyConsent_Fails()
    {
        var request = BuildRequest();
        request.ConsentToPrivacyPolicy = false;

        var result = await registrationService.StartAsync(request, null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.ConsentRequired);
    }

    [Theory]
    [InlineData("kort1!A")]
    [InlineData("geenhoofletter1!")]
    [InlineData("GEENKLEINLETTER1!")]
    [InlineData("GeenSyfer!")]
    [InlineData("GeenSpesiaal1")]
    public async Task StartAsync_WithAWeakPassword_SendsNoCode(string password)
    {
        var request = BuildRequest();
        request.Password = password;

        var result = await registrationService.StartAsync(request, null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.PasswordTooWeak);
        await skaaphondOtpClient.DidNotReceive().SendAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// The whole point of verifying first: nothing is created until the address is proven.
    /// </summary>
    [Fact]
    public async Task StartAsync_CreatesNoAccount()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StartAsync_RecordsConsentAgainstThePendingVerification()
    {
        var result = await registrationService.StartAsync(
            BuildRequest(), "203.0.113.7", "Toets/1.0", CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.PendingId.Should().Be(PendingId);
        result.Value.RecipientMasked.Should().Be("b***@v***.co.za");

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.OtpPendingId.Should().Be(PendingId);
        record.PrivacyPolicyVersion.Should().Be("2.1");
        record.TermsVersion.Should().Be("1.4");
        record.EmailVerifiedAt.Should().BeNull();
        record.SkaaphondUserId.Should().BeNull();
        record.IpAddress.Should().Be("203.0.113.7");
    }

    /// <summary>
    /// The likely cause is that SkaapHond has not admitted the registration purpose to
    /// its contact-bound path, so it searched for a user row that cannot exist yet.
    /// Registration must fail closed rather than proceed unverified.
    /// </summary>
    [Fact]
    public async Task StartAsync_WhenSkaaphondRefusesThePurpose_FailsClosed()
    {
        skaaphondOtpClient.SendAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(OtpSendOutcome.Failed(OtpFailure.NotSupported, "User not found."));

        var result = await registrationService.StartAsync(
            BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.RegistrationDisabled);
        (await dbContext.ConsentRecords.CountAsync()).Should().Be(0);
        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StartAsync_WhenSelfRegistrationIsOff_SendsNoCode()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings(false));

        var result = await registrationService.StartAsync(
            BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.RegistrationDisabled);
        await skaaphondOtpClient.DidNotReceive().SendAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StartAsync_WithoutAConfiguredClientRole_SendsNoCode()
    {
        var service = BuildService(Substitute.For<IUnitOfWork>(), clientRoleId: 0);

        var result = await service.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.RegistrationDisabled);
        await skaaphondOtpClient.DidNotReceive().SendAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    // ---- Step two: verify and create ---------------------------------------

    [Fact]
    public async Task CompleteAsync_WithTheCorrectCode_CreatesTheAccount()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        var result = await registrationService.CompleteAsync(
            BuildCompleteRequest(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Email.Should().Be("besoeker@voorbeeld.co.za");

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.EmailVerifiedAt.Should().Be(FixedClock.DefaultInstant);
        record.SkaaphondUserId.Should().Be("user-123");
    }

    [Fact]
    public async Task CompleteAsync_WithAWrongCode_CreatesNoAccount()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        skaaphondOtpClient.VerifyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(OtpVerifyOutcome.Rejected(2));

        var result = await registrationService.CompleteAsync(
            BuildCompleteRequest(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.VerificationCodeIncorrect);
        result.Error.Message.Should().Contain("2");

        await skaaphondUserClient.DidNotReceive().CreateClientUserAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.EmailVerifiedAt.Should().BeNull();
    }

    [Fact]
    public async Task CompleteAsync_WithAnExpiredCode_ReportsExpiry()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        skaaphondOtpClient.VerifyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(OtpVerifyOutcome.Failed(OtpFailure.Expired, null));

        var result = await registrationService.CompleteAsync(
            BuildCompleteRequest(), CancellationToken.None);

        result.Error!.Code.Should().Be(ErrorCodes.VerificationExpired);
    }

    [Fact]
    public async Task CompleteAsync_WithAnUnknownPendingId_IsNotFound()
    {
        var request = BuildCompleteRequest();
        request.PendingId = "geen-sodanige-id";

        var result = await registrationService.CompleteAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.NotFound);
    }

    [Fact]
    public async Task CompleteAsync_RunTwice_RefusesTheSecondAttempt()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);
        await registrationService.CompleteAsync(BuildCompleteRequest(), CancellationToken.None);

        var second = await registrationService.CompleteAsync(
            BuildCompleteRequest(), CancellationToken.None);

        second.IsFailure.Should().BeTrue();
        second.Error!.Code.Should().Be(ErrorCodes.RegistrationAlreadyCompleted);
    }

    /// <summary>
    /// The account is created from the address recorded at step one, so verifying one
    /// address and completing with another cannot register the unverified one.
    /// </summary>
    [Fact]
    public async Task CompleteAsync_UsesTheVerifiedAddressNotTheRequest()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        await registrationService.CompleteAsync(BuildCompleteRequest(), CancellationToken.None);

        await skaaphondUserClient.Received(1).CreateClientUserAsync(
            "besoeker",
            "besoeker@voorbeeld.co.za",
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CompleteAsync_WithAWeakPassword_VerifiesNothing()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        var request = BuildCompleteRequest();
        request.Password = "swak";

        var result = await registrationService.CompleteAsync(request, CancellationToken.None);

        result.Error!.Code.Should().Be(ErrorCodes.PasswordTooWeak);
        await skaaphondOtpClient.DidNotReceive().VerifyAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CompleteAsync_WhenSkaaphondRejects_KeepsTheAddressMarkedVerified()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        skaaphondUserClient
            .CreateClientUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(SkaaphondUserCreationResult.Failure("400: Username [besoeker] already exists."));

        var result = await registrationService.CompleteAsync(
            BuildCompleteRequest(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Message.Should().NotContain("besoeker");

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.EmailVerifiedAt.Should().NotBeNull();
        record.SkaaphondUserId.Should().BeNull();
    }

    // ---- Resend ------------------------------------------------------------

    /// <summary>
    /// SkaapHond invalidates the previous code and issues a new handle, so the stored
    /// one has to follow or completion would look up an id that no longer exists.
    /// </summary>
    [Fact]
    public async Task ResendCodeAsync_TracksTheNewPendingId()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        skaaphondOtpClient.ResendAsync(PendingId, Arg.Any<CancellationToken>())
            .Returns(OtpSendOutcome.Success("pending-xyz", DateTimeOffset.UtcNow.AddMinutes(10), null));

        var result = await registrationService.ResendCodeAsync(
            new ResendRegistrationCodeRequest { PendingId = PendingId }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.PendingId.Should().Be("pending-xyz");

        var record = await dbContext.ConsentRecords.SingleAsync();
        record.OtpPendingId.Should().Be("pending-xyz");
    }

    [Fact]
    public async Task ResendCodeAsync_DuringCooldown_ReportsIt()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);

        skaaphondOtpClient.ResendAsync(PendingId, Arg.Any<CancellationToken>())
            .Returns(OtpSendOutcome.Failed(OtpFailure.CooldownActive, null));

        var result = await registrationService.ResendCodeAsync(
            new ResendRegistrationCodeRequest { PendingId = PendingId }, CancellationToken.None);

        result.Error!.Code.Should().Be(ErrorCodes.VerificationCooldown);
    }

    [Fact]
    public async Task ResendCodeAsync_AfterCompletion_IsRefused()
    {
        await registrationService.StartAsync(BuildRequest(), null, null, CancellationToken.None);
        await registrationService.CompleteAsync(BuildCompleteRequest(), CancellationToken.None);

        var result = await registrationService.ResendCodeAsync(
            new ResendRegistrationCodeRequest { PendingId = PendingId }, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.NotFound);
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

    private RegistrationService BuildService(IUnitOfWork unitOfWork, int clientRoleId) => new(
        dbContext,
        tenantSettingsRepository,
        skaaphondUserClient,
        skaaphondOtpClient,
        Options.Create(new SkaaphondOptions { ClientRoleId = clientRoleId }),
        unitOfWork,
        FixedClock.Default(),
        NullLogger<RegistrationService>.Instance);

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

    private static CompleteRegistrationRequest BuildCompleteRequest() => new()
    {
        PendingId = PendingId,
        Code = "123456",
        Password = "Wagwoord1!"
    };
}
