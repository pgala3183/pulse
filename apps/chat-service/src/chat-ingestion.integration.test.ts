import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import type { ChatSource, NormalizedChatMessage } from "@pulse/platform-adapters";
import { KafkaTopics } from "@pulse/event-schemas";
import { ChatAdapterFactory } from "./chat-adapter.factory";
import {
  CHAT_KAFKA_CLIENT,
  ChatIngestionService,
} from "./chat-ingestion.service";

class FakeChatSource implements ChatSource {
  readonly platform: "twitch" | "youtube";
  private handler: ((message: NormalizedChatMessage) => void | Promise<void>) | null =
    null;
  connect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);

  constructor(platform: "twitch" | "youtube") {
    this.platform = platform;
  }

  onMessage(callback: (message: NormalizedChatMessage) => void | Promise<void>): void {
    this.handler = callback;
  }

  async emit(message: NormalizedChatMessage): Promise<void> {
    if (!this.handler) {
      throw new Error("No handler registered");
    }
    await this.handler(message);
  }
}

describe("ChatIngestionService integration", () => {
  let service: ChatIngestionService;
  let twitchAdapter: FakeChatSource;
  let youtubeAdapter: FakeChatSource;
  const publishTyped = vi.fn(async (_topic: string, _schema: unknown, payload: unknown) => payload);
  const disconnect = vi.fn(async () => undefined);

  beforeAll(async () => {
    process.env["CHAT_KAFKA_CONSUMER_DISABLED"] = "true";
    process.env["OTEL_SDK_DISABLED"] = "true";
    twitchAdapter = new FakeChatSource("twitch");
    youtubeAdapter = new FakeChatSource("youtube");

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatIngestionService,
        {
          provide: ChatAdapterFactory,
          useValue: {
            create: ({ platform }: { platform: "twitch" | "youtube" }) =>
              platform === "twitch" ? twitchAdapter : youtubeAdapter,
          },
        },
        {
          provide: CHAT_KAFKA_CLIENT,
          useValue: {
            publishTyped,
            consumeTyped: vi.fn(),
            disconnect,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ChatIngestionService);
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it("connects Twitch adapter and publishes normalized chat events", async () => {
    publishTyped.mockClear();

    await service.start({
      platform: "twitch",
      streamId: "stream-twitch",
      targetId: "cool_streamer",
    });
    expect(twitchAdapter.connect).toHaveBeenCalledWith("stream-twitch");

    await twitchAdapter.emit({
      platform: "twitch",
      streamId: "stream-twitch",
      messageId: "t-1",
      userId: "u-1",
      username: "Viewer",
      text: "hi twitch",
      occurredAt: "2026-07-13T22:00:00.000Z",
      kind: "regular",
    });

    expect(publishTyped).toHaveBeenCalledWith(
      KafkaTopics.CHAT_MESSAGES,
      expect.anything(),
      expect.objectContaining({
        type: "chat.message",
        platform: "twitch",
        streamId: "stream-twitch",
        text: "hi twitch",
        kind: "regular",
      }),
      { key: "stream-twitch" },
    );

    await service.stop("twitch", "stream-twitch");
    expect(twitchAdapter.disconnect).toHaveBeenCalled();
  });

  it("connects YouTube adapter and publishes Super Chat with amount fields", async () => {
    publishTyped.mockClear();

    await service.start({
      platform: "youtube",
      streamId: "stream-yt",
      targetId: "video-1",
    });
    expect(youtubeAdapter.connect).toHaveBeenCalledWith("stream-yt");

    await youtubeAdapter.emit({
      platform: "youtube",
      streamId: "stream-yt",
      messageId: "yt-1",
      userId: "UC1",
      username: "Fan",
      text: "great stream",
      occurredAt: "2026-07-13T22:01:00.000Z",
      kind: "super_chat",
      amountMicros: 2_000_000,
      currency: "USD",
    });

    expect(publishTyped).toHaveBeenCalledWith(
      KafkaTopics.CHAT_MESSAGES,
      expect.anything(),
      expect.objectContaining({
        type: "chat.message",
        platform: "youtube",
        kind: "super_chat",
        amountMicros: 2_000_000,
        currency: "USD",
        text: "great stream",
      }),
      { key: "stream-yt" },
    );

    await service.stop("youtube", "stream-yt");
    expect(youtubeAdapter.disconnect).toHaveBeenCalled();
  });

  it("selects adapters by platform identifier from the ingestion request", async () => {
    const factory = {
      create: vi.fn(({ platform }: { platform: "twitch" | "youtube" }) =>
        platform === "twitch" ? twitchAdapter : youtubeAdapter,
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatIngestionService,
        { provide: ChatAdapterFactory, useValue: factory },
        {
          provide: CHAT_KAFKA_CLIENT,
          useValue: { publishTyped, consumeTyped: vi.fn(), disconnect },
        },
      ],
    }).compile();

    const isolated = moduleRef.get(ChatIngestionService);
    await isolated.start({
      platform: "youtube",
      streamId: "s2",
      targetId: "vid",
    });
    expect(factory.create).toHaveBeenCalledWith({
      platform: "youtube",
      targetId: "vid",
    });
    await isolated.stop("youtube", "s2");
  });
});
