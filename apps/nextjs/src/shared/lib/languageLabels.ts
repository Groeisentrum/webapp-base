/**
 * Short labels for the language switcher.
 *
 * Three-letter abbreviations rather than flags: a language is not a country, and
 * several of South Africa's official languages share one. An unknown code falls back
 * to its own uppercased form, so configuring a language the template has never seen
 * still produces a sensible control instead of a blank one.
 */
const LANGUAGE_ABBREVIATIONS: Record<string, string> = {
  af: "AFR",
  en: "ENG",
  nr: "NDE",
  nso: "NSO",
  ss: "SSW",
  st: "SOT",
  tn: "TSW",
  ts: "TSO",
  ve: "VEN",
  xh: "XHO",
  zu: "ZUL",
};

const LANGUAGE_NAMES: Record<string, string> = {
  af: "Afrikaans",
  en: "English",
  nr: "isiNdebele",
  nso: "Sepedi",
  ss: "siSwati",
  st: "Sesotho",
  tn: "Setswana",
  ts: "Xitsonga",
  ve: "Tshivenda",
  xh: "isiXhosa",
  zu: "isiZulu",
};

export function languageAbbreviation(code: string): string {
  return LANGUAGE_ABBREVIATIONS[code.toLowerCase()] ?? code.toUpperCase();
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}
