namespace WebAppBase.Api.Domain.Results;

/// <summary>
/// Category of an expected failure. Drives the HTTP status a controller returns,
/// keeping status mapping out of the service layer.
/// </summary>
public enum ErrorKind
{
    Validation = 1,
    NotFound = 2,
    Conflict = 3
}
