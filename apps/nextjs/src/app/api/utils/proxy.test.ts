import { describe, expect, it } from "vitest";
import { unwrapWolkpoortEnvelope } from "@/app/api/utils/proxy";

/**
 * WolkPoort answers 200 even when the inner call failed, and double-encodes the
 * payload. These tests pin both behaviours, because getting either wrong makes a
 * downstream failure look like success to the caller.
 */
describe("unwrapWolkpoortEnvelope", () => {
  it("unwraps the double-encoded payload", () => {
    const inner = JSON.stringify({ statusCode: 200, responseBody: '{"id":7}' });
    const raw = JSON.stringify({ data: inner });

    expect(unwrapWolkpoortEnvelope(raw)).toEqual({ body: '{"id":7}', status: 200 });
  });

  it("lifts an embedded failure status out of the envelope", () => {
    const inner = JSON.stringify({ statusCode: 500, responseBody: '{"error":"stukkend"}' });
    const raw = JSON.stringify({ data: inner });

    expect(unwrapWolkpoortEnvelope(raw).status).toBe(500);
  });

  it("lifts an embedded 404", () => {
    const inner = JSON.stringify({ statusCode: 404, responseBody: "{}" });
    const raw = JSON.stringify({ data: inner });

    expect(unwrapWolkpoortEnvelope(raw).status).toBe(404);
  });

  it("serialises a response body that arrived as an object", () => {
    const inner = JSON.stringify({ statusCode: 200, responseBody: { id: 7 } });
    const raw = JSON.stringify({ data: inner });

    expect(JSON.parse(unwrapWolkpoortEnvelope(raw).body)).toEqual({ id: 7 });
  });

  it("passes through a payload that is not enveloped", () => {
    const raw = JSON.stringify({ id: 7 });

    expect(unwrapWolkpoortEnvelope(raw)).toEqual({ body: raw });
  });

  it("passes through a non-JSON payload untouched", () => {
    expect(unwrapWolkpoortEnvelope("plain text")).toEqual({ body: "plain text" });
  });

  it("leaves the status alone when the envelope carries none", () => {
    const inner = JSON.stringify({ responseBody: '{"id":7}' });
    const raw = JSON.stringify({ data: inner });

    expect(unwrapWolkpoortEnvelope(raw).status).toBeUndefined();
  });

  it("returns the inner string when it is not itself JSON", () => {
    const raw = JSON.stringify({ data: "not json" });

    expect(unwrapWolkpoortEnvelope(raw)).toEqual({ body: "not json" });
  });
});
