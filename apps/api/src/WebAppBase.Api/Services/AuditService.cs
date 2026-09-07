using System.Text.Json;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Services;

/// <inheritdoc />
public sealed class AuditService(
    WebAppDbContext dbContext,
    IActorContext actorContext,
    IClock clock) : IAuditService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public void Record(string entityType, long entityId, AuditAction action, object? oldValues, object? newValues)
    {
        var entry = new AuditLog
        {
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            ActorUserId = actorContext.UserId,
            ActorEmail = actorContext.Email,
            OldValues = Serialise(oldValues),
            NewValues = Serialise(newValues),
            OccurredAt = clock.UtcNow
        };

        dbContext.AuditLogs.Add(entry);
    }

    private static string? Serialise(object? values) => values is null
        ? null
        : JsonSerializer.Serialize(values, SerializerOptions);
}
