import { describe, expect, it } from "vitest";
import {
  decodePlanFromUrl,
  encodePlanForUrl,
} from "@/shared/lib/dagbeplanner/share";
import type { PlanPayload } from "@/shared/lib/dagbeplanner/types";

const samplePlan: PlanPayload = {
  startTime: "09:30",
  timeBudgetMinutes: 180,
  speed: "medium",
  destinations: [
    {
      kind: "destination",
      entryId: "dest-1",
      attractionId: "heritage-centre",
      name: "Erfenissentrum",
      dwellMinutes: 40,
      isCustom: false,
    },
    {
      kind: "destination",
      entryId: "dest-2",
      attractionId: null,
      name: "Middagete",
      dwellMinutes: 30,
      isCustom: true,
    },
  ],
};

describe("plan URL codec", () => {
  it("round-trips a plan through encode/decode", () => {
    const encoded = encodePlanForUrl(samplePlan);
    const decoded = decodePlanFromUrl(encoded);

    expect(decoded).toEqual(samplePlan);
  });

  it("produces a URL-safe string with no padding or reserved characters", () => {
    const encoded = encodePlanForUrl(samplePlan);

    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("rejects garbage input rather than throwing", () => {
    expect(decodePlanFromUrl("not-valid-base64!!")).toBeNull();
  });

  it("rejects a payload that decodes but fails the schema", () => {
    const tampered = encodePlanForUrl({ ...samplePlan, speed: "medium" }).slice(
      0,
      -4,
    );

    expect(decodePlanFromUrl(tampered)).toBeNull();
  });
});
