using WebAppBase.Api.Data;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class UnitOfWork(WebAppDbContext dbContext) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
