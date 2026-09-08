export const LANGUAGE_PARAM = "taal";

/**
 * Builds the href for switching language on the current page.
 *
 * Keeps the path and every other query parameter, so switching language while
 * reading a content item stays on that item instead of returning to the home page.
 */
export function buildLanguageHref(
  pathname: string,
  currentQuery: string,
  languageCode: string,
): string {
  const params = new URLSearchParams(currentQuery);
  params.set(LANGUAGE_PARAM, languageCode);

  return `${pathname}?${params.toString()}`;
}
