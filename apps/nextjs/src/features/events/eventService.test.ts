import { beforeEach, expect, it, vi } from "vitest";
import {
  getPublicCategories,
  getPublicContent,
} from "@/shared/services/publicService";
import { getVisitorEvents } from "./eventService";
import type { PublicContent } from "@/shared/interfaces/Domain";

vi.mock("@/shared/services/publicService", () => ({
  getPublicCategories: vi.fn(),
  getPublicContent: vi.fn(),
}));
const content = (id: number): PublicContent => ({
  id,
  categoryId: 1,
  title: String(id),
  description: null,
  body: null,
  assetType: 0,
  assetReference: null,
  eventStart: "2026-10-01T10:00:00Z",
  eventEnd: null,
  recurrence: { frequency: 0, dayOfWeek: null, weekOfMonth: null },
  locations: [],
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPublicCategories).mockResolvedValue([]);
});
it("follows the server page count, honours its page size and deduplicates items", async () => {
  vi.mocked(getPublicContent)
    .mockResolvedValueOnce({
      items: [content(1)],
      page: 1,
      pageSize: 1,
      totalCount: 3,
      totalPages: 3,
    })
    .mockResolvedValueOnce({
      items: [content(2)],
      page: 2,
      pageSize: 1,
      totalCount: 3,
      totalPages: 3,
    })
    .mockResolvedValueOnce({
      items: [content(2), content(3)],
      page: 3,
      pageSize: 1,
      totalCount: 3,
      totalPages: 3,
    });
  expect((await getVisitorEvents("af")).map((item) => item.id)).toEqual([
    "1",
    "2",
    "3",
  ]);
  expect(getPublicContent).toHaveBeenLastCalledWith({
    language: "af",
    page: 3,
    pageSize: 1,
  });
});
it("fails rather than claiming a partial list contains all events", async () => {
  vi.mocked(getPublicContent)
    .mockResolvedValueOnce({
      items: [content(1)],
      page: 1,
      pageSize: 1,
      totalCount: 2,
      totalPages: 2,
    })
    .mockRejectedValueOnce(new Error("Unavailable"));
  await expect(getVisitorEvents("af")).rejects.toThrow("Unavailable");
});
