namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Paging bounds applied to every listing endpoint.
/// </summary>
public static class PagingDefaults
{
    public const int FirstPage = 1;
    public const int DefaultPageSize = 25;

    /// <summary>Caps page size so a caller cannot request an unbounded result set.</summary>
    public const int MaximumPageSize = 100;

    public static int NormalisePage(int page) => page < FirstPage ? FirstPage : page;

    public static int NormalisePageSize(int pageSize) => pageSize switch
    {
        < 1 => DefaultPageSize,
        > MaximumPageSize => MaximumPageSize,
        _ => pageSize
    };
}
