using System.Runtime.CompilerServices;
using Amazon.BedrockAgentCore;
using Amazon.BedrockAgentCore.Model;
using Amazon.Runtime;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;

namespace WebAppBase.Api.Services;

/// <summary>
/// Invokes the Oom Paul harness in Bedrock AgentCore. The harness's published
/// configuration already carries the persona, system prompt, model and safety
/// rules, so a call here sends nothing but the conversation itself.
/// </summary>
public sealed class OomPaulLlmClient(
    IAmazonBedrockAgentCore agentCoreClient,
    IOptions<OomPaulOptions> options,
    ILogger<OomPaulLlmClient> logger) : IOomPaulLlmClient
{
    public async IAsyncEnumerable<OomPaulDelta> StreamReplyAsync(
        string sessionId,
        string message,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var settings = options.Value;

        var request = new InvokeHarnessRequest
        {
            HarnessArn = settings.HarnessArn,
            Qualifier = settings.Qualifier,
            RuntimeSessionId = sessionId,
            Messages =
            [
                new HarnessMessage
                {
                    Role = HarnessConversationRole.User,
                    Content = [new HarnessContentBlock { Text = message }]
                }
            ]
        };

        InvokeHarnessResponse response;

        try
        {
            response = await agentCoreClient.InvokeHarnessAsync(request, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw Failed(settings, exception);
        }

        // The response owns the event stream's socket, so it has to be disposed even when
        // the caller abandons the enumeration half way through.
        using (response)
        {
            // The token has to reach the enumeration as well: without it a visitor closing
            // the page leaves us reading a stream nobody is listening to.
            var events = response.Stream
                .WithCancellation(cancellationToken)
                .GetAsyncEnumerator();

            string? stopReason = null;

            try
            {
                while (true)
                {
                    // A yield cannot sit inside a try that catches, so each step of the
                    // enumeration is guarded on its own and the delta yielded outside it.
                    OomPaulDelta? delta = null;

                    try
                    {
                        if (!await events.MoveNextAsync())
                        {
                            break;
                        }

                        switch (events.Current)
                        {
                            case HarnessContentBlockDeltaEvent { Delta.Text: { } text }:
                                delta = new OomPaulDelta(text, null);
                                break;

                            case HarnessMessageStopEvent stop:
                                // Held back for the terminal event: the stop reason describes
                                // the whole turn rather than any one fragment of it. ToString
                                // keeps this working whether the SDK models the reason as a
                                // string or as one of its constant classes.
                                stopReason = stop.StopReason?.ToString();
                                break;
                        }
                    }
                    catch (Exception exception) when (exception is not OperationCanceledException)
                    {
                        throw Failed(settings, exception);
                    }

                    if (delta is not null)
                    {
                        yield return delta;
                    }
                }

                // A stream that ended without a stop event reports null rather than a
                // cheerful "end_turn": whether silence counts as a complete answer is the
                // service's call, not this client's.
                yield return new OomPaulDelta(null, stopReason);
            }
            finally
            {
                await events.DisposeAsync();
            }
        }
    }

    private OomPaulHarnessException Failed(OomPaulOptions settings, Exception exception)
    {
        // An AWS error code names the fault — throttling, access denied, a session id the
        // service refused — where the message often does not.
        var errorCode = (exception as AmazonServiceException)?.ErrorCode ?? exception.GetType().Name;

        logger.LogError(
            exception,
            "The Oom Paul harness {HarnessArn} ({Qualifier}) in {Region} failed with {ErrorCode}.",
            settings.HarnessArn,
            settings.Qualifier,
            settings.Region,
            errorCode);

        return new OomPaulHarnessException("The Oom Paul harness could not answer.", exception);
    }
}
