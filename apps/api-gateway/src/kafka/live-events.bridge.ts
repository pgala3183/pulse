import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  BrandMentionEventSchema,
  ChatMessageEventSchema,
  KafkaTopics,
  RecommendationEventSchema,
  SentimentResultEventSchema,
  type BrandMentionEvent,
  type ChatMessageEvent,
  type RecommendationEvent,
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

    this.stoppers.push(
      await this.kafkaClient.consumeTyped(
        KafkaTopics.CHAT_MESSAGES,
        ChatMessageEventSchema,
        async (event) => {
          await this.publishChatMessage(event);
        },
        { groupId: `${groupId}-chat` },
      ),
    );

    this.stoppers.push(
      await this.kafkaClient.consumeTyped(
        KafkaTopics.RECOMMENDATIONS,
        RecommendationEventSchema,
        async (event) => {
          await this.publishRecommendation(event);
        },
        { groupId: `${groupId}-recommendations` },
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

  async ingestChatMessageEvent(event: ChatMessageEvent): Promise<void> {
    await this.publishChatMessage(event);
  }

  async ingestRecommendationEvent(event: RecommendationEvent): Promise<void> {
    await this.publishRecommendation(event);
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

  private async publishChatMessage(event: ChatMessageEvent): Promise<void> {
    const mapped = this.store.addChatMessage(event);
    await this.pubSub.publish(LIVE_CHANNELS.chat(event.streamId), {
      chatMessageUpdates: mapped,
    });
  }

  private async publishRecommendation(event: RecommendationEvent): Promise<void> {
    const mapped = this.store.addRecommendation(event);
    await this.pubSub.publish(LIVE_CHANNELS.recommendation(event.streamId), {
      recommendationUpdates: mapped,
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
