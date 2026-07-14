import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessageEvent, TranscriptSegmentEvent } from "@pulse/event-schemas";
import { KafkaTopics } from "@pulse/event-schemas";
import { MlClient, MlClientError } from "@pulse/ml-client";
import { InMemorySentimentRepository } from "../db/repository";
import { InMemorySentimentCache } from "../redis/cache";
import { SentimentProcessor } from "../processing/sentiment.processor";
import {
  computeSponsorRelevance,
  isPaidChatKind,
  mapSentimentToUnitInterval,
} from "../scoring/sponsor-relevance";

type SentimentFixture = {
  id: string;
  event: ChatMessageEvent | TranscriptSegmentEvent;
  expected: {
    label?: "positive" | "neutral" | "negative";
    scoreMin?: number;
    scoreMax?: number;
    brands: string[];
    sponsorRelevanceMin?: number;
    sponsorRelevanceMax?: number;
    paidSignal?: boolean;
  };
};

const fixtures = JSON.parse(
  readFileSync(join(__dirname, "../../../../tests/fixtures/sentiment-inputs.json"), "utf8"),
) as SentimentFixture[];

const lexicon = JSON.parse(
  readFileSync(join(__dirname, "../../../../tests/fixtures/lexicon.json"), "utf8"),
) as { knownBrands: string[]; positiveLexicon: string[]; negativeLexicon: string[] };

describe("sponsor-relevance scoring", () => {
  it("maps sentiment scores into [0,1]", () => {
    expect(mapSentimentToUnitInterval(-1)).toBe(0);
    expect(mapSentimentToUnitInterval(0)).toBe(0.5);
    expect(mapSentimentToUnitInterval(1)).toBe(1);
  });

  it("weights paid Super Chat signals above equivalent unpaid chat", () => {
    const unpaid = computeSponsorRelevance({
      sentimentScore: 0.5,
      brandMatches: [{ brand: "Acme", confidence: 0.8, relevance: 0.8 }],
      isPaidSignal: false,
    });
    const paid = computeSponsorRelevance({
      sentimentScore: 0.5,
      brandMatches: [{ brand: "Acme", confidence: 0.8, relevance: 0.8 }],
      isPaidSignal: true,
    });
    expect(paid).toBeGreaterThan(unpaid);
    expect(isPaidChatKind("super_chat")).toBe(true);
  });
});

describe("sentiment-service fixtures", () => {
  let repo: InMemorySentimentRepository;
  let cache: InMemorySentimentCache;
  let publishTyped: ReturnType<typeof vi.fn>;
  let analyzeSentiment: ReturnType<typeof vi.fn>;
  let analyzeBrandRelevance: ReturnType<typeof vi.fn>;
  let processor: SentimentProcessor;

  beforeEach(() => {
    repo = new InMemorySentimentRepository();
    cache = new InMemorySentimentCache();
    publishTyped = vi.fn(async (_t: string, _s: unknown, payload: unknown) => payload);

    // Force lexical fallback so fixture expectations stay deterministic.
    analyzeSentiment = vi.fn(async () => {
      throw new MlClientError("forced fallback");
    });
    analyzeBrandRelevance = vi.fn(async () => {
      throw new MlClientError("forced fallback");
    });

    const ml = {
      analyzeSentiment,
      analyzeBrandRelevance,
      isLowConfidence: (confidence: number) => confidence < 0.45,
      lowConfidenceThreshold: 0.45,
    } as unknown as MlClient;

    processor = new SentimentProcessor(
      ml,
      { publishTyped, disconnect: vi.fn() } as never,
      repo,
      cache,
    );
  });

  it.each(fixtures)("$id produces consistent sentiment and sponsor relevance", async (fixture) => {
    const sourceType =
      fixture.event.type === "chat.message" ? "chat.message" : "transcript.segment";

    const result =
      sourceType === "chat.message"
        ? await processor.process({
            sourceType,
            event: fixture.event as ChatMessageEvent,
          })
        : await processor.process({
            sourceType,
            event: fixture.event as TranscriptSegmentEvent,
          });

    if (fixture.expected.label) {
      expect(result.sentiment.label).toBe(fixture.expected.label);
    }
    if (fixture.expected.scoreMin !== undefined) {
      expect(result.sentiment.score).toBeGreaterThanOrEqual(fixture.expected.scoreMin);
    }
    if (fixture.expected.scoreMax !== undefined) {
      expect(result.sentiment.score).toBeLessThanOrEqual(fixture.expected.scoreMax);
    }
    if (fixture.expected.sponsorRelevanceMin !== undefined) {
      expect(result.sentiment.sponsorRelevance ?? 0).toBeGreaterThanOrEqual(
        fixture.expected.sponsorRelevanceMin,
      );
    }
    if (fixture.expected.sponsorRelevanceMax !== undefined) {
      expect(result.sentiment.sponsorRelevance ?? 0).toBeLessThanOrEqual(
        fixture.expected.sponsorRelevanceMax,
      );
    }

    const brands = result.brandMentions.map((m) => m.brand).sort();
    expect(brands).toEqual([...fixture.expected.brands].sort());

    if (fixture.expected.paidSignal) {
      expect(result.sentiment.sponsorRelevance ?? 0).toBeGreaterThan(0.5);
    }

    expect(result.sentiment.analysisSource).toBe("lexical_fallback");
    expect(publishTyped).toHaveBeenCalledWith(
      KafkaTopics.SENTIMENT_RESULTS,
      expect.anything(),
      expect.objectContaining({ type: "sentiment.result" }),
      { key: fixture.event.streamId },
    );

    const cached = await cache.getLatest(fixture.event.streamId);
    expect(cached).toMatchObject({ streamId: fixture.event.streamId });

    // Lexicon fixture remains the source of known brands for fallbacks.
    expect(lexicon.knownBrands).toContain("Acme");
  });
});
