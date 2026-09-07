namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// The kind of mutation an audit entry records.
/// </summary>
public enum AuditAction
{
    None = 0,
    Created = 1,
    Updated = 2,
    Deleted = 3
}
