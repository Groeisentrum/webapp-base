using System.Text.Json;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;
using Amazon.Runtime;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;

namespace WebAppBase.Api.Services;

/// <summary>
/// Embeds text with a Titan model on Bedrock Runtime.
/// </summary>
/// <remarks>
/// Every AWS fault is rethrown as <see cref="InvalidOperationException"/> carrying the
/// model id and region: the indexer catches per item, and a bare SDK exception there
/// would say nothing about which model in which region refused the call.
/// </remarks>
public sealed class EmbeddingClient(
    IAmazonBedrockRuntime bedrockRuntime,
    IOptions<RetrievalOptions> options,
    ILogger<EmbeddingClient> logger) : IEmbeddingClient
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public async Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken)
    {
        var settings = options.Value;

        var request = new InvokeModelRequest
        {
            ModelId = settings.EmbeddingModelId,
            ContentType = "application/json",
            Accept = "application/json",
            Body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(new
            {
                inputText = text,
                dimensions = settings.Dimensions,
                normalize = true
            }))
        };

        InvokeModelResponse response;

        try
        {
            response = await bedrockRuntime.InvokeModelAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is AmazonBedrockRuntimeException or AmazonServiceException)
        {
            logger.LogError(
                exception,
                "Bedrock refused an embedding call to {ModelId} in {Region}.",
                settings.EmbeddingModelId,
                settings.Region);

            throw new InvalidOperationException(
                $"Embedding call to '{settings.EmbeddingModelId}' in '{settings.Region}' failed: {exception.Message}",
                exception);
        }

        var payload = await JsonSerializer.DeserializeAsync<TitanEmbeddingResponse>(
            response.Body,
            SerializerOptions,
            cancellationToken);

        var embedding = payload?.Embedding;

        if (embedding is null)
        {
            throw new InvalidOperationException(
                $"Embedding response from '{settings.EmbeddingModelId}' carried no embedding.");
        }

        // A silent width mismatch would fail every INSERT against the fixed-width VECTOR
        // column, far from the setting that caused it.
        if (embedding.Length != settings.Dimensions)
        {
            throw new InvalidOperationException(
                $"Model '{settings.EmbeddingModelId}' returned {embedding.Length} dimensions "
                + $"but the index is built for {settings.Dimensions}.");
        }

        return embedding;
    }

    private sealed class TitanEmbeddingResponse
    {
        public float[]? Embedding { get; set; }
    }
}
