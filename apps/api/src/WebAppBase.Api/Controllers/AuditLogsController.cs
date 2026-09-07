using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// The audit trail. Admin only — it records who changed what across the deployment.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = PolicyNames.AdminOnly)]
public sealed class AuditLogsController(AuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<AuditLogResponse>>> SearchAsync(
        [FromQuery] string? entityType,
        [FromQuery] long? entityId,
        [FromQuery] string? actorUserId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = PagingDefaults.FirstPage,
        [FromQuery] int pageSize = PagingDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var query = new AuditLogQuery(
            entityType,
            entityId,
            actorUserId,
            from,
            to,
            PagingDefaults.NormalisePage(page),
            PagingDefaults.NormalisePageSize(pageSize));

        var result = await auditLogService.SearchAsync(query, cancellationToken);

        return Ok(result);
    }
}
