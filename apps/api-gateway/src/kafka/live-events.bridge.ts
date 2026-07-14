import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  BrandMentionEventSchema,
  KafkaTopics,
  SentimentResultEventSchema,
  type BrandMentionEvent,
  type SentimentResultEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { PubSub } from "graphql-subscriptions";
import { Kafka } from "kafkajs";
import { APP_CONFIG, type ApiGatewayConfig } from "../config";
import { GRAPHQL_PUB_SUB, LIVE_CHANNELS } from "../pubsub.tokens";
import { GatewayStore } from "../store/gateway.store";

export const PULSE_KAFKA_CLIENT = Symbol("PULSE_KAFKA_CLIENT");

@Injectable()
export class LiveEventsBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveEventsBridge.name);
  private stoppers: Array<{ stop: () => Promise<void> }> = [];

  constructor(
    @Inject(PULSE_KAFKA_CLIENT) private readonly kafkaClient: PulseKafkaClient,
    @Inject(GRAPHQL_PUB_SUB) private readonly pubSub: PubSub,
    @Inject(APP_CONFIG) private readonly config: ApiGatewayConfig,
    private readonly store: GatewayStore,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.kafkaBridgeDisabled) {
      this.logger.warn("Kafka live-events bridge disabled");
      return;
    }

    const groupId = this.config.kafkaGroupId;

    this.stoppers.push(
      await this.kafkaClient.consumeTyped(
        KafkaTopics.SENTIMENT_RESULTS,
        SentimentResultEventSchema,
        async (event) => {
          await this.publishSentiment(event);
        },
        { groupId: `${groupId}-sentiment` },
      ),
    );

    this.stoppers.push(
      await this.kafkaClient.consumeTyped(
        KafkaTopics.BRAND_MENTIONS,
        BrandMentionEventSchema,
        async (event) => {
          await this.publishBrandMention(event);
        },
        { groupId: `${groupId}-brand` },
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.stoppers.map((stopper) => stopper.stop()));
    this.stoppers = [];
    await this.kafkaClient.disconnect();
  }

  async ingestSentimentEvent(event: SentimentResultEvent): Promise<void> {
    await this.publishSentiment(event);
  }

  async ingestBrandMentionEvent(event: BrandMentionEvent): Promise<void> {
    await this.publishBrandMention(event);
  }

  private async publishSentiment(event: SentimentResultEvent): Promise<void> {
    const mapped = this.store.addSentiment(event);
    await this.pubSub.publish(LIVE_CHANNELS.sentiment(event.streamId), {
      sentimentUpdates: mapped,
    });
  }

  private async publishBrandMention(event: BrandMentionEvent): Promise<void> {
    const mapped = this.store.addBrandMention(event);
    await this.pubSub.publish(LIVE_CHANNELS.brandMention(event.streamId), {
      brandMentionUpdates: mapped,
    });
  }
}

export function createPulseKafkaClient(config: ApiGatewayConfig): PulseKafkaClient {
  return new PulseKafkaClient(
    new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
    }),
  );
}
