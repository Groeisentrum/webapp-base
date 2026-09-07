using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class AuditLogRepository(WebAppDbContext dbContext) : IAuditLogRepository
{
    public async Task<PagedResult<AuditLog>> SearchAsync(AuditLogQuery query, CancellationToken cancellationToken)
    {
        var filtered = ApplyFilters(dbContext.AuditLogs.AsNoTracking(), query);

        var totalCount = await filtered.CountAsync(cancellationToken);

        var items = await filtered
            .OrderByDescending(auditLog => auditLog.OccurredAt)
            .ThenByDescending(auditLog => auditLog.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditLog>(items, totalCount, query.Page, query.PageSize);
    }

    private static IQueryable<AuditLog> ApplyFilters(IQueryable<AuditLog> source, AuditLogQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            source = source.Where(auditLog => auditLog.EntityType == query.EntityType);
        }

        if (query.EntityId is not null)
        {
            source = source.Where(auditLog => auditLog.EntityId == query.EntityId);
        }

        if (!string.IsNullOrWhiteSpace(query.ActorUserId))
        {
            source = source.Where(auditLog => auditLog.ActorUserId == query.ActorUserId);
        }

        if (query.OccurredFrom is not null)
        {
            source = source.Where(auditLog => auditLog.OccurredAt >= query.OccurredFrom);
        }

        if (query.OccurredTo is not null)
        {
            source = source.Where(auditLog => auditLog.OccurredAt <= query.OccurredTo);
        }

        return source;
    }
}
