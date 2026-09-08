using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Constants;

namespace WebAppBase.Api.Services;

/// <inheritdoc />
public sealed class SkaaphondOtpClient(
    HttpClient httpClient,
    IOptions<SkaaphondOptions> options,
    ILogger<SkaaphondOtpClient> logger) : ISkaaphondOtpClient
{
    private const string ApiKeyHeaderName = "X-API-KEY";
    private const string SendPath = "/auth/v2/otp/send";
    private const string ResendPath = "/auth/v2/otp/resend";
    private const string VerifyPath = "/auth/v2/otp/verify";

    public async Task<OtpSendOutcome> SendAsync(string email, CancellationToken cancellationToken)
    {
        // Only /send is system-gated; SkaapHond reads the caller's dataholder identity
        // off the key to fund gateway dispatch, so a placeholder key will not do.
        using var request = BuildRequest(HttpMethod.Post, SendPath, new
        {
            email,
            channel = OtpDeliveryChannels.Email,
            purpose = OtpPurposes.Registration
        });

        return await SendForOutcomeAsync(request, cancellationToken);
    }

    public async Task<OtpSendOutcome> ResendAsync(string pendingId, CancellationToken cancellationToken)
    {
        using var request = BuildRequest(HttpMethod.Post, ResendPath, new
        {
            pendingId,
            channel = OtpDeliveryChannels.Email
        });

        return await SendForOutcomeAsync(request, cancellationToken);
    }

    public async Task<OtpVerifyOutcome> VerifyAsync(
        string pendingId,
        string code,
        CancellationToken cancellationToken)
    {
        using var request = BuildRequest(HttpMethod.Post, VerifyPath, new { pendingId, code });

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "SkaapHond OTP verify was unreachable.");

            return OtpVerifyOutcome.Failed(OtpFailure.Unavailable, exception.Message);
        }

        using (response)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return OtpVerifyOutcome.Failed(MapFailure(response.StatusCode, body), body);
            }

            var verified = ReadBoolean(body, "verified");
            var attemptsRemaining = ReadInteger(body, "attemptsRemaining");

            return verified == true
                ? OtpVerifyOutcome.Success()
                : OtpVerifyOutcome.Rejected(attemptsRemaining);
        }
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string path, object payload)
    {
        var request = new HttpRequestMessage(method, path)
        {
            Content = JsonContent.Create(payload)
        };

        var apiKey = options.Value.ApiKey;
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.TryAddWithoutValidation(ApiKeyHeaderName, apiKey);
        }

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        return request;
    }

    private async Task<OtpSendOutcome> SendForOutcomeAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "SkaapHond OTP send was unreachable.");

            return OtpSendOutcome.Failed(OtpFailure.Unavailable, exception.Message);
        }

        using (response)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var failure = MapFailure(response.StatusCode, body);

                logger.LogWarning(
                    "SkaapHond OTP send failed with {StatusCode} ({Failure}): {Body}",
                    (int)response.StatusCode,
                    failure,
                    body);

                return OtpSendOutcome.Failed(failure, body);
            }

            var pendingId = ReadString(body, "pendingId");
            if (pendingId is null)
            {
                return OtpSendOutcome.Failed(OtpFailure.Unavailable, $"Unrecognised response: {body}");
            }

            return OtpSendOutcome.Success(
                pendingId,
                ReadDate(body, "expiresAt") ?? DateTimeOffset.UtcNow,
                ReadString(body, "recipientMasked"));
        }
    }

    /// <summary>
    /// A 404 on send means SkaapHond looked for a user row, which happens when the
    /// registration purpose is not yet admitted to its contact-bound path.
    /// </summary>
    private static OtpFailure MapFailure(HttpStatusCode statusCode, string body) => statusCode switch
    {
        HttpStatusCode.TooManyRequests => OtpFailure.CooldownActive,
        HttpStatusCode.NotFound when body.Contains("User not found", StringComparison.OrdinalIgnoreCase)
            => OtpFailure.NotSupported,
        HttpStatusCode.NotFound => OtpFailure.Expired,
        HttpStatusCode.Gone => OtpFailure.Expired,
        HttpStatusCode.BadRequest => OtpFailure.IncorrectCode,
        HttpStatusCode.Unauthorized => OtpFailure.NotSupported,
        HttpStatusCode.Forbidden => OtpFailure.NotSupported,
        _ => OtpFailure.Unavailable
    };

    private static string? ReadString(string body, string propertyName) =>
        ReadProperty(body, propertyName)?.GetString();

    private static bool? ReadBoolean(string body, string propertyName)
    {
        var element = ReadProperty(body, propertyName);

        return element?.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => null
        };
    }

    private static int? ReadInteger(string body, string propertyName)
    {
        var element = ReadProperty(body, propertyName);

        return element?.ValueKind == JsonValueKind.Number && element.Value.TryGetInt32(out var value)
            ? value
            : null;
    }

    private static DateTimeOffset? ReadDate(string body, string propertyName)
    {
        var element = ReadProperty(body, propertyName);

        return element?.ValueKind == JsonValueKind.String
            && DateTimeOffset.TryParse(element.Value.GetString(), out var value)
                ? value
                : null;
    }

    private static JsonElement? ReadProperty(string body, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(body);

            // Cloned so the element outlives the document this using disposes.
            return document.RootElement.TryGetProperty(propertyName, out var value)
                ? value.Clone()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
