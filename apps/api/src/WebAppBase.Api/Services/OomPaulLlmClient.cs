using System.Text;
using Amazon.BedrockAgentCore;
using Amazon.BedrockAgentCore.Model;
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
    IOptions<OomPaulOptions> options) : IOomPaulLlmClient
{
    public async Task<string> SendMessageAsync(string sessionId, string message, CancellationToken cancellationToken)
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

        var response = await agentCoreClient.InvokeHarnessAsync(request, cancellationToken);

        var reply = new StringBuilder();

        await foreach (var streamEvent in response.Stream)
        {
            if (streamEvent is HarnessContentBlockDeltaEvent { Delta.Text: { } text })
            {
                reply.Append(text);
            }
        }

        return reply.ToString();
    }
}
