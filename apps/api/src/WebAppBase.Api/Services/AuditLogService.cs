using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Read access to the audit trail for the admin viewer.
/// </summary>
public sealed class AuditLogService(IAuditLogRepository auditLogRepository)
{
    public async Task<PagedResponse<AuditLogResponse>> SearchAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken)
    {
        var page = await auditLogRepository.SearchAsync(query, cancellationToken);

        var totalPages = page.PageSize <= 0
            ? 0
            : (int)Math.Ceiling(page.TotalCount / (double)page.PageSize);

        return new PagedResponse<AuditLogResponse>(
            [.. page.Items.Select(MapResponse)],
            page.TotalCount,
            page.Page,
            page.PageSize,
            totalPages);
    }

    private static AuditLogResponse MapResponse(AuditLog auditLog) => new(
        auditLog.Id,
        auditLog.EntityType,
        auditLog.EntityId,
        auditLog.Action,
        auditLog.ActorUserId,
        auditLog.ActorEmail,
        auditLog.OldValues,
        auditLog.NewValues,
        auditLog.OccurredAt);
}
