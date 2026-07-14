/**
 * Metric definitions consumed by dashboards — keep in sync with docs/metrics.md.
 *
 * - chatVolume: count of chat.message
 * - paidChatVolume: Super Chat / membership chat kinds
 * - sentiment*: distribution + average of sentiment.result scores
 * - brandMentionCount / uniqueBrands: sponsor detection frequency
 * - averageSponsorRelevance: mean sponsorRelevance when present
 * - engagementScore: chatVolume + 2*paidChatVolume + brandMentionCount
 */

export type WindowType = "1m" | "5m" | "session";

export type AnalyticsMetrics = {
  chatVolume: number;
  paidChatVolume: number;
  sentimentSampleCount: number;
  averageSentimentScore: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  brandMentionCount: number;
  uniqueBrands: string[];
  averageSponsorRelevance: number;
  engagementScore: number;
};

export type ChatAggregateEvent = {
  kind: "chat";
  occurredAt: string;
  chatKind?: string;
};

export type SentimentAggregateEvent = {
  kind: "sentiment";
  occurredAt: string;
  score: number;
  label: "positive" | "neutral" | "negative";
  sponsorRelevance?: number;
};

export type BrandAggregateEvent = {
  kind: "brand";
  occurredAt: string;
  brand: string;
};

export type AggregateInputEvent =
  | ChatAggregateEvent
  | SentimentAggregateEvent
  | BrandAggregateEvent;

export type WindowBounds = {
  windowType: WindowType;
  windowStart: string;
  windowEnd: string;
};

export const EMPTY_METRICS: AnalyticsMetrics = {
  chatVolume: 0,
  paidChatVolume: 0,
  sentimentSampleCount: 0,
  averageSentimentScore: 0,
  positiveCount: 0,
  neutralCount: 0,
  negativeCount: 0,
  brandMentionCount: 0,
  uniqueBrands: [],
  averageSponsorRelevance: 0,
  engagementScore: 0,
};

export function isPaidChatKind(kind: string | undefined): boolean {
  return kind === "super_chat" || kind === "membership";
}

export function floorToMinuteUtc(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      0,
      0,
    ),
  );
}

export function floorToFiveMinutesUtc(date: Date): Date {
  const minute = date.getUTCMinutes() - (date.getUTCMinutes() % 5);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      minute,
      0,
      0,
    ),
  );
}

export function windowBoundsFor(occurredAt: string, windowType: "1m" | "5m"): WindowBounds {
  const ts = new Date(occurredAt);
  if (windowType === "1m") {
    const start = floorToMinuteUtc(ts);
    const end = new Date(start.getTime() + 60_000);
    return {
      windowType,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
    };
  }
  const start = floorToFiveMinutesUtc(ts);
  const end = new Date(start.getTime() + 5 * 60_000);
  return {
    windowType,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}

export function eventInWindow(
  occurredAt: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const t = new Date(occurredAt).getTime();
  return t >= new Date(windowStart).getTime() && t < new Date(windowEnd).getTime();
}

/**
 * Pure aggregation over a fixed event sequence for one window.
 * Used by the service and unit-tested against hand-computed expectations.
 */
export function aggregateMetrics(events: AggregateInputEvent[]): AnalyticsMetrics {
  let chatVolume = 0;
  let paidChatVolume = 0;
  let sentimentSampleCount = 0;
  let sentimentSum = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let brandMentionCount = 0;
  const brands = new Set<string>();
  let sponsorRelevanceSum = 0;
  let sponsorRelevanceCount = 0;

  for (const event of events) {
    if (event.kind === "chat") {
      chatVolume += 1;
      if (isPaidChatKind(event.chatKind)) {
        paidChatVolume += 1;
      }
      continue;
    }

    if (event.kind === "sentiment") {
      sentimentSampleCount += 1;
      sentimentSum += event.score;
      if (event.label === "positive") positiveCount += 1;
      else if (event.label === "neutral") neutralCount += 1;
      else negativeCount += 1;
      if (event.sponsorRelevance !== undefined) {
        sponsorRelevanceSum += event.sponsorRelevance;
        sponsorRelevanceCount += 1;
      }
      continue;
    }

    brandMentionCount += 1;
    brands.add(event.brand);
  }

  const averageSentimentScore =
    sentimentSampleCount === 0 ? 0 : sentimentSum / sentimentSampleCount;
  const averageSponsorRelevance =
    sponsorRelevanceCount === 0 ? 0 : sponsorRelevanceSum / sponsorRelevanceCount;
  const engagementScore = chatVolume + 2 * paidChatVolume + brandMentionCount;

  return {
    chatVolume,
    paidChatVolume,
    sentimentSampleCount,
    averageSentimentScore,
    positiveCount,
    neutralCount,
    negativeCount,
    brandMentionCount,
    uniqueBrands: [...brands].sort(),
    averageSponsorRelevance,
    engagementScore,
  };
}

export function aggregateMetricsForWindow(
  events: AggregateInputEvent[],
  windowStart: string,
  windowEnd: string,
): AnalyticsMetrics {
  return aggregateMetrics(
    events.filter((event) => eventInWindow(event.occurredAt, windowStart, windowEnd)),
  );
}
