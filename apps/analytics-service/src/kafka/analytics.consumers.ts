import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  BrandMentionEventSchema,
  ChatMessageEventSchema,
  KafkaTopics,
  SentimentResultEventSchema,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import {
  ANALYTICS_KAFKA_CLIENT,
  AnalyticsProcessor,
} from "../processing/analytics.processor";

@Injectable()
export class AnalyticsConsumers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsConsumers.name);
  private readonly stoppers: Array<() => Promise<void>> = [];

  constructor(
    @Inject(ANALYTICS_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    private readonly processor: AnalyticsProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env["ANALYTICS_KAFKA_CONSUMER_DISABLED"] === "true") {
      this.logger.warn("Analytics Kafka consumers disabled");
      return;
    }

    const groupId = process.env["KAFKA_GROUP_ID"] ?? "pulse-analytics-service";

    this.stoppers.push(
      (
        await this.kafka.consumeTyped(
          KafkaTopics.CHAT_MESSAGES,
          ChatMessageEventSchema,
          async (event) => {
            await this.processor.onChat(event);
          },
          { groupId: `${groupId}-chat` },
        )
      ).stop,
    );

    this.stoppers.push(
      (
        await this.kafka.consumeTyped(
          KafkaTopics.SENTIMENT_RESULTS,
          SentimentResultEventSchema,
          async (event) => {
            await this.processor.onSentiment(event);
          },
          { groupId: `${groupId}-sentiment` },
        )
      ).stop,
    );

    this.stoppers.push(
      (
        await this.kafka.consumeTyped(
          KafkaTopics.BRAND_MENTIONS,
          BrandMentionEventSchema,
          async (event) => {
            await this.processor.onBrandMention(event);
          },
          { groupId: `${groupId}-brand` },
        )
      ).stop,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.stoppers.map(async (stop) => stop()));
    this.stoppers.length = 0;
  }
}
