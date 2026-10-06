namespace WebAppBase.Api.Domain.Results;

/// <summary>
/// Category of an expected failure. Drives the HTTP status a controller returns,
/// keeping status mapping out of the service layer.
/// </summary>
public enum ErrorKind
{
    Validation = 1,
    NotFound = 2,
    Conflict = 3,

    /// <summary>
    /// A dependency this deployment needs is switched off, unconfigured or refusing
    /// calls. The caller did nothing wrong, so reporting it as a client error would
    /// send them looking for a mistake they cannot find.
    /// </summary>
    Unavailable = 4
}
