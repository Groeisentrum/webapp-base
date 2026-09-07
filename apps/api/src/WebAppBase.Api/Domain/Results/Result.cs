namespace WebAppBase.Api.Domain.Results;

/// <summary>
/// Outcome of an operation that either succeeds with no payload or fails with a known error.
/// Unexpected infrastructure failures throw instead of returning a result.
/// </summary>
public class Result
{
    protected Result(Error? error) => Error = error;

    public Error? Error { get; }

    public bool IsSuccess => Error is null;

    public bool IsFailure => Error is not null;

    public static Result Success() => new(null);

    public static Result Failure(Error error) => new(error);
}

/// <summary>
/// Outcome of an operation that yields a value on success.
/// </summary>
public sealed class Result<TValue> : Result
{
    private readonly TValue? value;

    private Result(TValue? value, Error? error)
        : base(error) => this.value = value;

    /// <summary>The produced value. Only valid when the result succeeded.</summary>
    public TValue Value => IsSuccess
        ? value!
        : throw new InvalidOperationException("Cannot read Value from a failed result.");

    public static Result<TValue> Success(TValue value) => new(value, null);

    public static new Result<TValue> Failure(Error error) => new(default, error);
}
