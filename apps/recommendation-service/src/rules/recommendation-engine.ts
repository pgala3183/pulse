import type { AnalyticsRollupEvent, RecommendationEvent } from "@pulse/event-schemas";
import { randomUUID } from "node:crypto";

export type RecommendationDraft = Omit<RecommendationEvent, "eventId" | "type" | "occurredAt"> & {
  occurredAt?: string;
};

export type RecommendationEngineInput = {
  /** Latest rollup for the stream (typically 1m). */
  current: AnalyticsRollupEvent;
  /** Prior rollup of the same window type, if known. */
  previous?: AnalyticsRollupEvent;
};

/**
 * Rule-based recommendations derived from analytics rollups.
 * Keep messages actionable for operators / dashboard banners.
 */
export function generateRecommendations(
  input: RecommendationEngineInput,
): RecommendationDraft[] {
  const { current, previous } = input;
  const drafts: RecommendationDraft[] = [];
  const base = {
    platform: current.platform,
    streamId: current.streamId,
    windowType: current.windowType,
  };

  // Sentiment dipped after (or alongside) elevated sponsor detections.
  if (
    previous &&
    current.brandMentionCount > 0 &&
    current.averageSentimentScore < previous.averageSentimentScore - 0.25
  ) {
    const brand = current.uniqueBrands[0] ?? "the sponsor";
    drafts.push({
      ...base,
      code: "sentiment_dip_after_sponsor",
      severity: "action",
      title: "Sentiment dipped after sponsor activity",
      summary: `Sentiment fell from ${previous.averageSentimentScore.toFixed(2)} to ${current.averageSentimentScore.toFixed(2)} while ${brand} was mentioned — consider follow-up messaging.`,
      relatedBrands: current.uniqueBrands,
      evidence: {
        previousAverageSentimentScore: previous.averageSentimentScore,
        currentAverageSentimentScore: current.averageSentimentScore,
        brandMentionCount: current.brandMentionCount,
      },
    });
  }

  // Concentrated negative sentiment in the window.
  if (
    current.sentimentSampleCount >= 2 &&
    current.negativeCount >= current.positiveCount + current.neutralCount &&
    current.averageSentimentScore <= -0.2
  ) {
    drafts.push({
      ...base,
      code: "negative_sentiment_cluster",
      severity: "warning",
      title: "Negative sentiment cluster",
      summary: `${String(current.negativeCount)} of ${String(current.sentimentSampleCount)} samples are negative (avg ${current.averageSentimentScore.toFixed(2)}). Review recent chat tone.`,
      relatedBrands: current.uniqueBrands,
      evidence: {
        negativeCount: current.negativeCount,
        sentimentSampleCount: current.sentimentSampleCount,
      },
    });
  }

  // High engagement with strong sponsor relevance — amplify.
  if (current.engagementScore >= 6 && current.averageSponsorRelevance >= 0.5) {
    drafts.push({
      ...base,
      code: "sponsor_engagement_opportunity",
      severity: "info",
      title: "High sponsor-engagement window",
      summary: `Engagement score ${String(current.engagementScore)} with sponsor relevance ${current.averageSponsorRelevance.toFixed(2)} — a strong moment to lean into brand callouts.`,
      relatedBrands: current.uniqueBrands,
      evidence: {
        engagementScore: current.engagementScore,
        averageSponsorRelevance: current.averageSponsorRelevance,
      },
    });
  }

  // Paid chat without brand mentions — monetization without clear sponsor tie-in.
  if (current.paidChatVolume > 0 && current.brandMentionCount === 0) {
    drafts.push({
      ...base,
      code: "paid_chat_without_brand",
      severity: "info",
      title: "Paid chat without brand detection",
      summary: `${String(current.paidChatVolume)} paid chat event(s) landed without a brand mention — thank supporters or nudge the sponsored CTA.`,
      relatedBrands: [],
      evidence: { paidChatVolume: current.paidChatVolume },
    });
  }

  return drafts;
}

export function toRecommendationEvent(draft: RecommendationDraft): RecommendationEvent {
  return {
    eventId: randomUUID(),
    type: "recommendation.generated",
    occurredAt: draft.occurredAt ?? new Date().toISOString(),
    platform: draft.platform,
    streamId: draft.streamId,
    code: draft.code,
    severity: draft.severity,
    title: draft.title,
    summary: draft.summary,
    relatedBrands: draft.relatedBrands ?? [],
    windowType: draft.windowType,
    evidence: draft.evidence,
  };
}
