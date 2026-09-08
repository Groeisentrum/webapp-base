namespace WebAppBase.Api.Domain.ValueObjects;

/// <summary>
/// Who is looking at the public surface. Anonymous unless a valid token was supplied.
/// </summary>
public sealed class Viewer
{
    public static readonly Viewer Anonymous = new(false, []);

    public Viewer(bool isAuthenticated, IEnumerable<string> roles)
    {
        IsAuthenticated = isAuthenticated;
        Roles = new HashSet<string>(roles, StringComparer.OrdinalIgnoreCase);
    }

    public bool IsAuthenticated { get; }

    public IReadOnlySet<string> Roles { get; }

    public bool HasRole(string role) => Roles.Contains(role);
}
