namespace WebAppBase.Api.Repositories;

/// <summary>
/// Commits everything staged during the current request as one transaction, so a
/// mutation, its audit entry and any queued notification land together or not at all.
/// </summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
