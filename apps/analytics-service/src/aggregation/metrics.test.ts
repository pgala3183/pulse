import { describe, expect, it } from "vitest";
import { StreamAnalyticsAggregator } from "./aggregator";
import {
  aggregateMetrics,
  aggregateMetricsForWindow,
  windowBoundsFor,
  type AggregateInputEvent,
} from "./metrics";

/**
 * Fixed sequence with hand-computed expected outputs:
 *
 * T0=2026-07-13T22:00:10Z (same UTC minute and 5-minute bucket)
 * 1. chat regular
 * 2. chat super_chat
 * 3. chat regular
 * 4. sentiment +0.5 positive, sponsorRelevance 0.8
 * 5. sentiment -0.5 negative, sponsorRelevance 0.2
 * 6. brand Acme
 *
 * Hand totals for the full sequence / that 1m window:
 *   chatVolume = 3
 *   paidChatVolume = 1
 *   sentimentSampleCount = 2
 *   averageSentimentScore = (0.5 + -0.5) / 2 = 0
 *   positiveCount = 1, negativeCount = 1, neutralCount = 0
 *   brandMentionCount = 1
 *   uniqueBrands = ["Acme"]
 *   averageSponsorRelevance = (0.8 + 0.2) / 2 = 0.5
 *   engagementScore = 3 + 2*1 + 1 = 6
 */
const SEQUENCE: AggregateInputEvent[] = [
  { kind: "chat", occurredAt: "2026-07-13T22:00:10.000Z", chatKind: "regular" },
  { kind: "chat", occurredAt: "2026-07-13T22:00:20.000Z", chatKind: "super_chat" },
  { kind: "chat", occurredAt: "2026-07-13T22:00:30.000Z", chatKind: "regular" },
  {
    kind: "sentiment",
    occurredAt: "2026-07-13T22:00:40.000Z",
    score: 0.5,
    label: "positive",
    sponsorRelevance: 0.8,
  },
  {
    kind: "sentiment",
    occurredAt: "2026-07-13T22:00:50.000Z",
    score: -0.5,
    label: "negative",
    sponsorRelevance: 0.2,
  },
  { kind: "brand", occurredAt: "2026-07-13T22:00:55.000Z", brand: "Acme" },
];

const HAND_EXPECTED = {
  chatVolume: 3,
  paidChatVolume: 1,
  sentimentSampleCount: 2,
  averageSentimentScore: 0,
  positiveCount: 1,
  neutralCount: 0,
  negativeCount: 1,
  brandMentionCount: 1,
  uniqueBrands: ["Acme"],
  averageSponsorRelevance: 0.5,
  engagementScore: 6,
};

describe("aggregateMetrics (hand-computed)", () => {
  it("matches hand-computed totals for the fixed sequence", () => {
    expect(aggregateMetrics(SEQUENCE)).toEqual(HAND_EXPECTED);
  });

  it("filters by window bounds — event outside the minute is excluded", () => {
    const bounds = windowBoundsFor("2026-07-13T22:00:10.000Z", "1m");
    expect(bounds).toEqual({
      windowType: "1m",
      windowStart: "2026-07-13T22:00:00.000Z",
      windowEnd: "2026-07-13T22:01:00.000Z",
    });

    const withOutOfWindow: AggregateInputEvent[] = [
      ...SEQUENCE,
      { kind: "chat", occurredAt: "2026-07-13T22:01:00.000Z", chatKind: "regular" },
    ];

    // Exclusive end at 22:01:00 → extra chat excluded; totals unchanged.
    expect(aggregateMetricsForWindow(withOutOfWindow, bounds.windowStart, bounds.windowEnd)).toEqual(
      HAND_EXPECTED,
    );
  });

  it("computes 5-minute bucket alignment", () => {
    expect(windowBoundsFor("2026-07-13T22:07:00.000Z", "5m")).toEqual({
      windowType: "5m",
      windowStart: "2026-07-13T22:05:00.000Z",
      windowEnd: "2026-07-13T22:10:00.000Z",
    });
  });
});

describe("StreamAnalyticsAggregator", () => {
  it("emits 1m, 5m, and session rollups with matching session totals", () => {
    const aggregator = new StreamAnalyticsAggregator();
    let last = aggregator.ingest("youtube", "stream-1", SEQUENCE[0]!);
    for (const event of SEQUENCE.slice(1)) {
      last = aggregator.ingest("youtube", "stream-1", event);
    }

    const oneMinute = last.find((r) => r.windowType === "1m");
    const fiveMinute = last.find((r) => r.windowType === "5m");
    const session = last.find((r) => r.windowType === "session");

    expect(oneMinute).toMatchObject(HAND_EXPECTED);
    expect(fiveMinute).toMatchObject(HAND_EXPECTED);
    expect(session).toMatchObject({
      ...HAND_EXPECTED,
      windowStart: "2026-07-13T22:00:10.000Z",
      windowEnd: "2026-07-13T22:00:55.000Z",
    });
  });
});
