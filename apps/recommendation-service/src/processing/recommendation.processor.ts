import { Inject, Injectable } from "@nestjs/common";
import {
  KafkaTopics,
  RecommendationEventSchema,
  type AnalyticsRollupEvent,
  type RecommendationEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import {
  generateRecommendations,
  toRecommendationEvent,
} from "../rules/recommendation-engine";

export const RECOMMENDATION_KAFKA_CLIENT = Symbol("RECOMMENDATION_KAFKA_CLIENT");

@Injectable()
export class RecommendationProcessor {
  /** Last 1m rollup per stream for delta rules. */
  private readonly previousOneMinute = new Map<string, AnalyticsRollupEvent>();

  constructor(
    @Inject(RECOMMENDATION_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
  ) {}

  async onAnalyticsRollup(rollup: AnalyticsRollupEvent): Promise<RecommendationEvent[]> {
    if (rollup.windowType !== "1m") {
      return [];
    }

    const key = `${rollup.platform}:${rollup.streamId}`;
    const previous = this.previousOneMinute.get(key);
    const drafts = generateRecommendations({ current: rollup, previous });
    this.previousOneMinute.set(key, rollup);

    const published: RecommendationEvent[] = [];
    for (const draft of drafts) {
      const event = toRecommendationEvent(draft);
      await this.kafka.publishTyped(
        KafkaTopics.RECOMMENDATIONS,
        RecommendationEventSchema,
        event,
        { key: rollup.streamId },
      );
      published.push(event);
    }
    return published;
  }
}
