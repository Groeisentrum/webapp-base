using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Services;

/// <summary>
/// Stages audit entries for the current unit of work.
/// </summary>
/// <remarks>
/// Entries are staged rather than saved so they commit in the same transaction as
/// the mutation they describe — an audit row can never survive a rolled-back change,
/// nor a change escape unaudited.
/// </remarks>
public interface IAuditService
{
    void Record(string entityType, long entityId, AuditAction action, object? oldValues, object? newValues);
}
