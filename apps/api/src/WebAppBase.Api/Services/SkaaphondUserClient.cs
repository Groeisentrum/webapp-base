using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;

namespace WebAppBase.Api.Services;

/// <inheritdoc />
public sealed class SkaaphondUserClient(
    HttpClient httpClient,
    IOptions<SkaaphondOptions> options,
    ILogger<SkaaphondUserClient> logger) : ISkaaphondUserClient
{
    private const string ApiKeyHeaderName = "X-API-KEY";
    private const string CreateUserPath = "/users/create";

    public async Task<SkaaphondUserCreationResult> CreateClientUserAsync(
        string userName,
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var settings = options.Value;

        using var request = new HttpRequestMessage(HttpMethod.Post, CreateUserPath)
        {
            Content = JsonContent.Create(new
            {
                userName,
                email,
                password,
                friendlyName = userName,
                dataHolderId = settings.DataHolderId,
                entityId = settings.EntityId,
                isActive = true,
                mfaEnabled = false,
                // SkaapHond assigns roles by numeric id, so the client role id is
                // configured per environment rather than named here.
                linkedRoleIds = new[] { settings.ClientRoleId }
            })
        };

        // Sent even though SkaapHond does not currently require it on this endpoint:
        // when that check is restored, registration keeps working unchanged.
        if (!string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            request.Headers.TryAddWithoutValidation(ApiKeyHeaderName, settings.ApiKey);
        }

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "SkaapHond rejected account creation with {StatusCode}: {Body}",
                (int)response.StatusCode,
                body);

            return SkaaphondUserCreationResult.Failure($"{(int)response.StatusCode}: {body}");
        }

        var userId = ReadUserId(body);

        return userId is null
            ? SkaaphondUserCreationResult.Failure($"Unrecognised response body: {body}")
            : SkaaphondUserCreationResult.Success(userId);
    }

    /// <summary>
    /// The endpoint returns the new id, but bare rather than wrapped, and the exact
    /// shape has varied — so accept a raw scalar or a small object carrying an id.
    /// </summary>
    private static string? ReadUserId(string body)
    {
        var trimmed = body.Trim().Trim('"');
        if (trimmed.Length == 0)
        {
            return null;
        }

        if (!trimmed.StartsWith('{'))
        {
            return trimmed;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            foreach (var propertyName in new[] { "id", "userId", "Id", "UserId" })
            {
                if (document.RootElement.TryGetProperty(propertyName, out var value))
                {
                    return value.ValueKind == JsonValueKind.String
                        ? value.GetString()
                        : value.ToString();
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }
}
