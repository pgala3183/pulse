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
    private readonly store: GatewayStore,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env["KAFKA_BRIDGE_DISABLED"] === "true") {
      this.logger.warn("Kafka live-events bridge disabled (KAFKA_BRIDGE_DISABLED=true)");
      return;
    }

    const groupId = process.env["KAFKA_GROUP_ID"] ?? "pulse-api-gateway";

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

  /** Used by integration tests to simulate Kafka → GraphQL fan-out. */
  async ingestSentimentEvent(event: SentimentResultEvent): Promise<void> {
    await this.publishSentiment(event);
  }

  /** Used by integration tests to simulate Kafka → GraphQL fan-out. */
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

export function createPulseKafkaClientFromEnv(): PulseKafkaClient {
  const brokers = (process.env["KAFKA_BROKERS"] ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  const kafka = new Kafka({
    clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-api-gateway",
    brokers: brokers.length > 0 ? brokers : ["localhost:9092"],
  });

  return new PulseKafkaClient(kafka);
}
