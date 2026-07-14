import { Inject, NotFoundException } from "@nestjs/common";
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from "@nestjs/graphql";
import {
  IngestionCommandEventSchema,
  KafkaTopics,
  type IngestionCommandEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { PubSub } from "graphql-subscriptions";
import { randomUUID } from "node:crypto";
import { PULSE_KAFKA_CLIENT } from "../kafka/live-events.bridge";
import { GRAPHQL_PUB_SUB, LIVE_CHANNELS } from "../pubsub.tokens";
import { GatewayStore } from "../store/gateway.store";
import { Platform, StreamIngestionStatus } from "./enums";
import { StartStreamIngestionInput, StopStreamIngestionInput } from "./inputs";
import {
  AnalyticsSummary,
  BrandMention,
  SentimentResult,
  StreamIngestion,
} from "./models";

@Resolver()
export class GatewayResolver {
  constructor(
    private readonly store: GatewayStore,
    @Inject(PULSE_KAFKA_CLIENT) private readonly kafkaClient: PulseKafkaClient,
    @Inject(GRAPHQL_PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [StreamIngestion], { description: "List known stream ingestion sessions" })
  streamIngestions(): StreamIngestion[] {
    return this.store.listIngestions();
  }

  @Query(() => StreamIngestion, { nullable: true })
  streamIngestion(
    @Args("platform", { type: () => Platform }) platform: Platform,
    @Args("streamId") streamId: string,
  ): StreamIngestion | undefined {
    return this.store.getIngestion(platform, streamId);
  }

  @Query(() => [SentimentResult])
  liveSentiment(
    @Args("streamId") streamId: string,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ): SentimentResult[] {
    return this.store.listSentiments(streamId, limit);
  }

  @Query(() => [BrandMention])
  liveBrandMentions(
    @Args("streamId") streamId: string,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ): BrandMention[] {
    return this.store.listBrandMentions(streamId, limit);
  }

  @Query(() => AnalyticsSummary)
  analyticsSummary(
    @Args("streamId") streamId: string,
    @Args("platform", { type: () => Platform }) platform: Platform,
  ): AnalyticsSummary {
    return this.store.getAnalyticsSummary(streamId, platform);
  }

  @Mutation(() => StreamIngestion)
  async startStreamIngestion(
    @Args("input") input: StartStreamIngestionInput,
  ): Promise<StreamIngestion> {
    const ingestion: StreamIngestion = {
      streamId: input.streamId,
      platform: input.platform,
      targetId: input.targetId,
      status: StreamIngestionStatus.STARTING,
      updatedAt: new Date().toISOString(),
    };
    this.store.upsertIngestion(ingestion);

    await this.publishIngestionCommand({
      eventId: randomUUID(),
      type: "ingestion.command",
      action: "start",
      platform: input.platform,
      streamId: input.streamId,
      targetId: input.targetId,
      occurredAt: new Date().toISOString(),
    });

    return (
      this.store.setIngestionStatus(
        input.platform,
        input.streamId,
        StreamIngestionStatus.RUNNING,
      ) ?? ingestion
    );
  }

  @Mutation(() => StreamIngestion)
  async stopStreamIngestion(
    @Args("input") input: StopStreamIngestionInput,
  ): Promise<StreamIngestion> {
    const existing = this.store.getIngestion(input.platform, input.streamId);
    if (!existing) {
      throw new NotFoundException(
        `No ingestion session for ${input.platform}/${input.streamId}`,
      );
    }

    this.store.setIngestionStatus(
      input.platform,
      input.streamId,
      StreamIngestionStatus.STOPPING,
    );

    await this.publishIngestionCommand({
      eventId: randomUUID(),
      type: "ingestion.command",
      action: "stop",
      platform: input.platform,
      streamId: input.streamId,
      targetId: existing.targetId,
      occurredAt: new Date().toISOString(),
    });

    const stopped = this.store.setIngestionStatus(
      input.platform,
      input.streamId,
      StreamIngestionStatus.STOPPED,
    );
    if (!stopped) {
      throw new NotFoundException(
        `No ingestion session for ${input.platform}/${input.streamId}`,
      );
    }
    return stopped;
  }

  @Subscription(() => SentimentResult, {
    name: "sentimentUpdates",
    description: "Live sentiment results for a stream (Kafka → graphql-ws)",
  })
  sentimentUpdates(@Args("streamId") streamId: string) {
    return this.pubSub.asyncIterableIterator(LIVE_CHANNELS.sentiment(streamId));
  }

  @Subscription(() => BrandMention, {
    name: "brandMentionUpdates",
    description: "Live sponsor/brand-mention detections for a stream",
  })
  brandMentionUpdates(@Args("streamId") streamId: string) {
    return this.pubSub.asyncIterableIterator(LIVE_CHANNELS.brandMention(streamId));
  }

  private async publishIngestionCommand(command: IngestionCommandEvent): Promise<void> {
    if (process.env["KAFKA_PUBLISH_DISABLED"] === "true") {
      return;
    }
    await this.kafkaClient.publishTyped(
      KafkaTopics.INGESTION_COMMANDS,
      IngestionCommandEventSchema,
      command,
      { key: command.streamId },
    );
  }
}
