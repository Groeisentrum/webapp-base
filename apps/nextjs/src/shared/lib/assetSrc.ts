/**
 * Whether an asset reference is something a browser can actually load.
 *
 * `AssetReference` is a free-text field an editor fills in, and what belongs in it
 * depends on how the deployment hosts its media — an absolute URL for a CDN, a rooted
 * path for files served alongside the app. A bare `vtm/hoofmonument.jpg` is neither:
 * the browser resolves it against the current page, gets a 404, and paints its own
 * broken-image glyph on top of whatever the design put underneath.
 *
 * So a reference that cannot resolve is not rendered at all, and the placeholder the
 * component already draws is what the visitor sees. A missing photograph should look
 * like a missing photograph, not like a broken page.
 */
export function isDisplayableImageSrc(reference: string | null | undefined): boolean {
  if (!reference) {
    return false;
  }

  const trimmed = reference.trim();

  // Protocol-relative and rooted paths both resolve predictably from any page.
  if (trimmed.startsWith("/")) {
    return true;
  }

  if (trimmed.startsWith("data:image/")) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
