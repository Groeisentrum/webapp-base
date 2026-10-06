import { describe, expect, it } from "vitest";
import { isDisplayableImageSrc } from "@/shared/lib/assetSrc";

/**
 * The sample content ships references like "vtm/hoofmonument.jpg", which resolve
 * against the current page and 404. The browser then paints its own broken-image glyph
 * over the placeholder underneath, which is what made every card look broken.
 */
describe("isDisplayableImageSrc", () => {
  it("rejects a bare relative reference", () => {
    expect(isDisplayableImageSrc("vtm/hoofmonument.jpg")).toBe(false);
  });

  it("accepts a rooted path, which resolves the same from any page", () => {
    expect(isDisplayableImageSrc("/media/hoofmonument.jpg")).toBe(true);
  });

  it("accepts an absolute http and https URL", () => {
    expect(isDisplayableImageSrc("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isDisplayableImageSrc("http://cdn.example.com/a.jpg")).toBe(true);
  });

  it("accepts an inline data image", () => {
    expect(isDisplayableImageSrc("data:image/png;base64,iVBOR")).toBe(true);
  });

  /** A reference nobody filled in, and one that is only whitespace. */
  it("rejects nothing at all", () => {
    expect(isDisplayableImageSrc(null)).toBe(false);
    expect(isDisplayableImageSrc(undefined)).toBe(false);
    expect(isDisplayableImageSrc("   ")).toBe(false);
  });

  /** javascript: and file: must never reach an img src. */
  it("rejects a non-http scheme", () => {
    expect(isDisplayableImageSrc("javascript:alert(1)")).toBe(false);
    expect(isDisplayableImageSrc("file:///etc/passwd")).toBe(false);
  });
});
