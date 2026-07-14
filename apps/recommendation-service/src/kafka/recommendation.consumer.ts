import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AnalyticsRollupEventSchema, KafkaTopics } from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { APP_CONFIG, type RecommendationServiceConfig } from "../config";
import {
  RECOMMENDATION_KAFKA_CLIENT,
  RecommendationProcessor,
} from "../processing/recommendation.processor";

@Injectable()
export class RecommendationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationConsumer.name);
  private stop: (() => Promise<void>) | null = null;

  constructor(
    @Inject(RECOMMENDATION_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(APP_CONFIG) private readonly config: RecommendationServiceConfig,
    private readonly processor: RecommendationProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.kafkaConsumerDisabled) {
      this.logger.warn("Recommendation Kafka consumer disabled");
      return;
    }

    const handle = await this.kafka.consumeTyped(
      KafkaTopics.ANALYTICS_ROLLUPS,
      AnalyticsRollupEventSchema,
      async (rollup) => {
        await this.processor.onAnalyticsRollup(rollup);
      },
      { groupId: this.config.kafkaGroupId },
    );
    this.stop = handle.stop;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.stop) {
      await this.stop();
      this.stop = null;
    }
  }
}
