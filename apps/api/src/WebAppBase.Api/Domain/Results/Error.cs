namespace WebAppBase.Api.Domain.Results;

/// <summary>
/// An expected failure. <see cref="Message"/> is user-facing and therefore Afrikaans;
/// <see cref="Code"/> is the stable identifier callers branch on.
/// </summary>
public sealed record Error(ErrorKind Kind, string Code, string Message)
{
    public static Error Validation(string code, string message) => new(ErrorKind.Validation, code, message);

    public static Error NotFound(string code, string message) => new(ErrorKind.NotFound, code, message);

    public static Error Conflict(string code, string message) => new(ErrorKind.Conflict, code, message);
}
