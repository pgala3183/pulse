import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import {
  ChatMessageEventSchema,
  KafkaTopics,
  type ChatMessageEvent,
  type Platform,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import type { ChatSource, NormalizedChatMessage } from "@pulse/platform-adapters";
import { randomUUID } from "node:crypto";
import { ChatAdapterFactory } from "./chat-adapter.factory";

export const CHAT_KAFKA_CLIENT = Symbol("CHAT_KAFKA_CLIENT");

export type StartChatIngestionInput = {
  platform: Platform;
  streamId: string;
  targetId: string;
};

type ActiveSession = {
  adapter: ChatSource;
  platform: Platform;
  streamId: string;
  targetId: string;
};

@Injectable()
export class ChatIngestionService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatIngestionService.name);
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(
    private readonly adapterFactory: ChatAdapterFactory,
    @Inject(CHAT_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
  ) {}

  async start(input: StartChatIngestionInput): Promise<void> {
    const key = this.key(input.platform, input.streamId);
    const existing = this.sessions.get(key);
    if (existing) {
      this.logger.warn("Chat ingestion already running; restarting session", { key });
      await this.stop(input.platform, input.streamId);
    }

    const adapter = this.adapterFactory.create({
      platform: input.platform,
      targetId: input.targetId,
    });

    adapter.onMessage(async (message) => {
      await this.publishNormalized(message);
    });

    await adapter.connect(input.streamId);
    this.sessions.set(key, {
      adapter,
      platform: input.platform,
      streamId: input.streamId,
      targetId: input.targetId,
    });
    this.logger.log(`Started ${input.platform} chat ingestion for ${input.streamId}`);
  }

  async stop(platform: Platform, streamId: string): Promise<void> {
    const key = this.key(platform, streamId);
    const session = this.sessions.get(key);
    if (!session) {
      return;
    }
    await session.adapter.disconnect();
    this.sessions.delete(key);
    this.logger.log(`Stopped ${platform} chat ingestion for ${streamId}`);
  }

  listSessions(): Array<{ platform: Platform; streamId: string; targetId: string }> {
    return [...this.sessions.values()].map(({ platform, streamId, targetId }) => ({
      platform,
      streamId,
      targetId,
    }));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.sessions.values()].map(async (session) => {
        await session.adapter.disconnect();
      }),
    );
    this.sessions.clear();
    await this.kafka.disconnect();
  }

  /** Visible for integration tests: normalize + publish without a live adapter. */
  async publishNormalized(message: NormalizedChatMessage): Promise<ChatMessageEvent> {
    const event = {
      eventId: randomUUID(),
      type: "chat.message" as const,
      platform: message.platform,
      streamId: message.streamId,
      occurredAt: message.occurredAt,
      messageId: message.messageId,
      userId: message.userId,
      username: message.username,
      text: message.text,
      kind: message.kind,
      ...(message.amountMicros !== undefined
        ? { amountMicros: message.amountMicros }
        : {}),
      ...(message.currency !== undefined ? { currency: message.currency } : {}),
    };

    return this.kafka.publishTyped(KafkaTopics.CHAT_MESSAGES, ChatMessageEventSchema, event, {
      key: message.streamId,
    });
  }

  private key(platform: Platform, streamId: string): string {
    return `${platform}:${streamId}`;
  }
}
