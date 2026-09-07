using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Read access to the audit trail. Writes go through <c>IAuditService</c> so every
/// entry is staged alongside the change it describes.
/// </summary>
public interface IAuditLogRepository
{
    Task<PagedResult<AuditLog>> SearchAsync(AuditLogQuery query, CancellationToken cancellationToken);
}
