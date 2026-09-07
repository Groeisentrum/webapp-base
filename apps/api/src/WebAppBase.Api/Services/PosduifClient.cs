using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;

namespace WebAppBase.Api.Services;

/// <inheritdoc />
public sealed class PosduifClient(HttpClient httpClient, IOptions<PosduifOptions> options) : IPosduifClient
{
    private const string ApiKeyHeaderName = "X-API-KEY";
    private const string NotificationPath = "/notifications";

    public async Task SendAsync(string notificationType, long? contentId, CancellationToken cancellationToken)
    {
        var settings = options.Value;

        using var request = new HttpRequestMessage(HttpMethod.Post, NotificationPath)
        {
            Content = JsonContent.Create(new
            {
                type = notificationType,
                payload = new { contentId }
            })
        };

        request.Headers.TryAddWithoutValidation(ApiKeyHeaderName, settings.ApiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
