import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VideoFrameEvent } from "@pulse/event-schemas";
import { KafkaTopics } from "@pulse/event-schemas";
import { MlClient, MlClientError } from "@pulse/ml-client";
import { InMemorySponsorDetectionRepository } from "../db/repository";
import { VideoFrameProcessor } from "../processing/video-frame.processor";

type Fixture = {
  id: string;
  event: VideoFrameEvent;
  mlResponse?: {
    detections: Array<{ brand: string; mentionText: string; confidence: number }>;
    confidence: number;
  };
  mlError?: boolean;
  lexicalHint?: string;
  expectedBrands: string[];
  expectedSource?: "ml" | "lexical_fallback";
};

const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, "../../../../tests/fixtures/sponsor-detection-inputs.json"),
    "utf8",
  ),
) as Fixture[];

describe("video-service sponsor detection fixtures", () => {
  let repo: InMemorySponsorDetectionRepository;
  let publishTyped: ReturnType<typeof vi.fn>;
  let detectSponsors: ReturnType<typeof vi.fn>;
  let processor: VideoFrameProcessor;

  beforeEach(() => {
    repo = new InMemorySponsorDetectionRepository();
    publishTyped = vi.fn(async (_t: string, _s: unknown, payload: unknown) => payload);
    detectSponsors = vi.fn();

    const ml = {
      detectSponsors,
      isLowConfidence: (confidence: number) => confidence < 0.45,
      lowConfidenceThreshold: 0.45,
    } as unknown as MlClient;

    processor = new VideoFrameProcessor(
      ml,
      { publishTyped, disconnect: vi.fn() } as never,
      repo,
    );
  });

  it.each(fixtures)("$id yields consistent sponsor detections", async (fixture) => {
    if (fixture.mlError) {
      detectSponsors.mockRejectedValue(new MlClientError("upstream down"));
    } else {
      detectSponsors.mockResolvedValue(fixture.mlResponse);
    }

    const published = await processor.processFrame(fixture.event, {
      lexicalHint: fixture.lexicalHint,
    });

    const brands = published.map((item) => item.brand).sort();
    expect(brands).toEqual([...fixture.expectedBrands].sort());

    if (fixture.expectedSource) {
      expect(published.every((item) => item.analysisSource === fixture.expectedSource)).toBe(
        true,
      );
    }

    expect(publishTyped).toHaveBeenCalledWith(
      KafkaTopics.BRAND_MENTIONS,
      expect.anything(),
      expect.objectContaining({ type: "brand.mention", sourceType: "video.frame" }),
      { key: fixture.event.streamId },
    );

    const stored = await repo.listByStream(fixture.event.streamId);
    expect(stored.length).toBeGreaterThanOrEqual(fixture.expectedBrands.length);
  });
});
