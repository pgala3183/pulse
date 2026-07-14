import { Inject, Injectable } from "@nestjs/common";
import {
  AnalyticsRollupEventSchema,
  KafkaTopics,
  type AnalyticsRollupEvent,
  type BrandMentionEvent,
  type ChatMessageEvent,
  type SentimentResultEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { randomUUID } from "node:crypto";
import { StreamAnalyticsAggregator } from "../aggregation/aggregator";
import type { StreamRollup } from "../aggregation/aggregator";
import type { AnalyticsRepository } from "../db/repository";

export const ANALYTICS_KAFKA_CLIENT = Symbol("ANALYTICS_KAFKA_CLIENT");
export const ANALYTICS_REPO = Symbol("ANALYTICS_REPO");

@Injectable()
export class AnalyticsProcessor {
  private readonly aggregator = new StreamAnalyticsAggregator();

  constructor(
    @Inject(ANALYTICS_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(ANALYTICS_REPO) private readonly repo: AnalyticsRepository,
  ) {}

  async onChat(event: ChatMessageEvent): Promise<AnalyticsRollupEvent[]> {
    return this.publishRollups(
      this.aggregator.ingest(event.platform, event.streamId, {
        kind: "chat",
        occurredAt: event.occurredAt,
        chatKind: event.kind,
      }),
    );
  }

  async onSentiment(event: SentimentResultEvent): Promise<AnalyticsRollupEvent[]> {
    return this.publishRollups(
      this.aggregator.ingest(event.platform, event.streamId, {
        kind: "sentiment",
        occurredAt: event.occurredAt,
        score: event.score,
        label: event.label,
        sponsorRelevance: event.sponsorRelevance,
      }),
    );
  }

  async onBrandMention(event: BrandMentionEvent): Promise<AnalyticsRollupEvent[]> {
    return this.publishRollups(
      this.aggregator.ingest(event.platform, event.streamId, {
        kind: "brand",
        occurredAt: event.occurredAt,
        brand: event.brand,
      }),
    );
  }

  private async publishRollups(rollups: StreamRollup[]): Promise<AnalyticsRollupEvent[]> {
    const published: AnalyticsRollupEvent[] = [];

    for (const rollup of rollups) {
      const event: AnalyticsRollupEvent = {
        eventId: randomUUID(),
        type: "analytics.rollup",
        platform: rollup.platform,
        streamId: rollup.streamId,
        windowType: rollup.windowType,
        windowStart: rollup.windowStart,
        windowEnd: rollup.windowEnd,
        occurredAt: new Date().toISOString(),
        chatVolume: rollup.chatVolume,
        paidChatVolume: rollup.paidChatVolume,
        sentimentSampleCount: rollup.sentimentSampleCount,
        averageSentimentScore: rollup.averageSentimentScore,
        positiveCount: rollup.positiveCount,
        neutralCount: rollup.neutralCount,
        negativeCount: rollup.negativeCount,
        brandMentionCount: rollup.brandMentionCount,
        uniqueBrands: rollup.uniqueBrands,
        averageSponsorRelevance: rollup.averageSponsorRelevance,
        engagementScore: rollup.engagementScore,
      };

      await this.repo.upsertRollup({
        id: `${rollup.platform}:${rollup.streamId}:${rollup.windowType}:${rollup.windowStart}`,
        platform: rollup.platform,
        streamId: rollup.streamId,
        windowType: rollup.windowType,
        windowStart: rollup.windowStart,
        windowEnd: rollup.windowEnd,
        metrics: event,
        updatedAt: event.occurredAt,
      });

      await this.kafka.publishTyped(
        KafkaTopics.ANALYTICS_ROLLUPS,
        AnalyticsRollupEventSchema,
        event,
        { key: rollup.streamId },
      );
      published.push(event);
    }

    return published;
  }
}
