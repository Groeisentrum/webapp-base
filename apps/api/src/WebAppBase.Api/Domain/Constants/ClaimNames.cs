namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Claim names emitted by SkaapHond. Several appear under more than one spelling
/// depending on token version, so consumers must check each alternative in order.
/// </summary>
public static class ClaimNames
{
    public const string Subject = "sub";
    public const string NameIdentifier = "nameid";
    public const string NameIdentifierUri = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

    public const string Email = "email";
    public const string EmailUpper = "Email";
    public const string UserPrincipalName = "upn";
    public const string UniqueName = "unique_name";

    public const string Name = "name";

    public const string EntityId = "entityId";
    public const string EntityIdUpper = "EntityId";

    public const string DataHolderId = "dataHolderId";
    public const string DataHolderIdUpper = "DataHolderId";

    public const string Role = "role";
    public const string Roles = "roles";
    public const string RoleUri = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
}
