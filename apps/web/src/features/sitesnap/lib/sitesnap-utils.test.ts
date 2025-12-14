import { describe, expect, it } from "vitest";
import {
  buildSiteSnapUpdatePayload,
  extractImageReferences,
  parseImageUrlInput,
  resolveSiteSnapJobUiState,
} from "./sitesnap-utils";

describe("sitesnap utils", () => {
  it("parses and deduplicates external image urls", () => {
    const urls = parseImageUrlInput(
      "https://a.example/x.jpg, https://b.example/y.png\nhttps://a.example/x.jpg,not-a-url",
    );

    expect(urls).toEqual([
      "https://a.example/x.jpg",
      "https://b.example/y.png",
    ]);
  });

  it("extracts external urls and file assets from image records", () => {
    const refs = extractImageReferences([
      {
        id: "img-1",
        snapId: "snap-1",
        imageUrl: "https://cdn.example/a.jpg",
        position: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        sourceType: "external_url",
      },
      {
        id: "img-2",
        snapId: "snap-1",
        imageUrl: "https://signed.example/temporary",
        position: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        sourceType: "file_asset",
        fileAssetId: "asset-1",
      },
    ]);

    expect(refs.imageUrls).toEqual(["https://cdn.example/a.jpg"]);
    expect(refs.imageFileAssetIds).toEqual(["asset-1"]);
  });

  it("marks failed analysis states as retryable", () => {
    const failed = resolveSiteSnapJobUiState({
      analysisState: "queue_unavailable",
      jobState: "failed",
    });

    expect(failed.tone).toBe("critical");
    expect(failed.canRetry).toBe(true);
    expect(failed.isTerminal).toBe(true);
  });

  it("builds update payload with undefined for empty image lists", () => {
    const payload = buildSiteSnapUpdatePayload({
      notes: "  Updated notes  ",
      locationZone: "  Level-2  ",
      imageUrls: [],
      imageFileAssetIds: [],
    });

    expect(payload).toEqual({
      notes: "Updated notes",
      locationZone: "Level-2",
      imageUrls: undefined,
      imageFileAssetIds: undefined,
    });
  });
});
