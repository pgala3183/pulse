import { describe, expect, it } from "vitest";
import type { AnalyticsRollupEvent } from "@pulse/event-schemas";
import { generateRecommendations } from "./recommendation-engine";

function rollup(
  overrides: Partial<AnalyticsRollupEvent> &
    Pick<AnalyticsRollupEvent, "averageSentimentScore" | "brandMentionCount">,
): AnalyticsRollupEvent {
  return {
    eventId: "550e8400-e29b-41d4-a716-446655443001",
    type: "analytics.rollup",
    platform: "youtube",
    streamId: "stream-1",
    windowType: "1m",
    windowStart: "2026-07-13T22:00:00.000Z",
    windowEnd: "2026-07-13T22:01:00.000Z",
    occurredAt: "2026-07-13T22:01:00.000Z",
    chatVolume: 3,
    paidChatVolume: 1,
    sentimentSampleCount: 2,
    positiveCount: 0,
    neutralCount: 0,
    negativeCount: 2,
    uniqueBrands: ["Acme"],
    averageSponsorRelevance: 0.6,
    engagementScore: 6,
    ...overrides,
  };
}

describe("generateRecommendations", () => {
  it("flags sentiment dip after sponsor mention", () => {
    const previous = rollup({
      averageSentimentScore: 0.4,
      brandMentionCount: 0,
      uniqueBrands: [],
      negativeCount: 0,
      positiveCount: 2,
    });
    const current = rollup({
      averageSentimentScore: 0.0,
      brandMentionCount: 1,
      uniqueBrands: ["Acme"],
    });

    const recs = generateRecommendations({ current, previous });
    expect(recs.some((r) => r.code === "sentiment_dip_after_sponsor")).toBe(true);
    const dip = recs.find((r) => r.code === "sentiment_dip_after_sponsor");
    expect(dip?.summary).toMatch(/follow-up messaging/i);
    expect(dip?.relatedBrands).toContain("Acme");
  });

  it("flags high sponsor-engagement opportunities", () => {
    const current = rollup({
      averageSentimentScore: 0.2,
      brandMentionCount: 1,
      engagementScore: 8,
      averageSponsorRelevance: 0.7,
    });
    const recs = generateRecommendations({ current });
    expect(recs.some((r) => r.code === "sponsor_engagement_opportunity")).toBe(true);
  });

  it("flags paid chat without brand detection", () => {
    const current = rollup({
      averageSentimentScore: 0.1,
      brandMentionCount: 0,
      uniqueBrands: [],
      paidChatVolume: 2,
      engagementScore: 5,
      averageSponsorRelevance: 0.1,
      negativeCount: 0,
      positiveCount: 2,
      sentimentSampleCount: 2,
    });
    const recs = generateRecommendations({ current });
    expect(recs.some((r) => r.code === "paid_chat_without_brand")).toBe(true);
  });
});
