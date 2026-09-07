using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Results;

namespace WebAppBase.Api.Extensions;

/// <summary>
/// Maps service results onto HTTP responses, keeping status-code decisions out of
/// the service layer and consistent across every controller.
/// </summary>
public static class ResultExtensions
{
    public static ActionResult<TValue> ToActionResult<TValue>(this Result<TValue> result) =>
        result.IsSuccess
            ? new OkObjectResult(result.Value)
            : ToProblem(result.Error!);

    public static ActionResult ToActionResult(this Result result) =>
        result.IsSuccess
            ? new NoContentResult()
            : ToProblem(result.Error!);

    public static ActionResult<TValue> ToCreatedResult<TValue>(
        this Result<TValue> result,
        string actionName,
        object routeValues) =>
        result.IsSuccess
            ? new CreatedAtActionResult(actionName, null, routeValues, result.Value)
            : ToProblem(result.Error!);

    private static ObjectResult ToProblem(Error error)
    {
        var statusCode = error.Kind switch
        {
            ErrorKind.Validation => StatusCodes.Status400BadRequest,
            ErrorKind.NotFound => StatusCodes.Status404NotFound,
            ErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = error.Message,
            Extensions = { ["code"] = error.Code }
        };

        return new ObjectResult(problemDetails) { StatusCode = statusCode };
    }
}
