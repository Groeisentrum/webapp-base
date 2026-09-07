using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Per-field translations for any translatable entity.
/// </summary>
[ApiController]
[Route("api/translations")]
[Authorize(Policy = PolicyNames.ContentManagement)]
public sealed class TranslationsController(TranslationService translationService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TranslationResponse>>> GetForEntityAsync(
        [FromQuery] string entityType,
        [FromQuery] long entityId,
        CancellationToken cancellationToken)
    {
        var translations = await translationService.GetForEntityAsync(entityType, entityId, cancellationToken);

        return Ok(translations);
    }

    /// <summary>Creates the translation, or replaces the existing value for that target.</summary>
    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TranslationResponse>> UpsertAsync(
        [FromBody] UpsertTranslationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await translationService.UpsertAsync(request, cancellationToken);

        return result.ToActionResult();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var result = await translationService.DeleteAsync(id, cancellationToken);

        return result.ToActionResult();
    }
}
