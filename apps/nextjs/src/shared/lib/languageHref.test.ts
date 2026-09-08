import { describe, expect, it } from "vitest";
import { buildLanguageHref } from "@/shared/lib/languageHref";

describe("buildLanguageHref", () => {
  it("stays on the current page rather than returning home", () => {
    expect(buildLanguageHref("/inhoud/42", "taal=af", "en")).toBe("/inhoud/42?taal=en");
  });

  it("adds the language when none was set", () => {
    expect(buildLanguageHref("/kategorie/besoek", "", "zu")).toBe("/kategorie/besoek?taal=zu");
  });

  it("replaces the existing language rather than appending a second one", () => {
    const href = buildLanguageHref("/", "taal=af", "en");

    expect(href).toBe("/?taal=en");
    expect(href.match(/taal=/g)).toHaveLength(1);
  });

  it("preserves unrelated query parameters", () => {
    const href = buildLanguageHref("/kategorie/beleef", "taal=af&page=3", "en");

    expect(href).toContain("page=3");
    expect(href).toContain("taal=en");
  });

  it("encodes a language code that needs it", () => {
    expect(buildLanguageHref("/", "", "pt-BR")).toBe("/?taal=pt-BR");
  });
});
