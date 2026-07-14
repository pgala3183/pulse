import { describe, expect, it, vi } from "vitest";
import {
  YoutubeChatAdapter,
  mapYoutubeMessage,
  type YoutubeLiveChatMessage,
} from "./youtube-chat-adapter";
import { YoutubeQuotaScheduler } from "./youtube-quota";

const baseAuthor = {
  channelId: "UC123",
  displayName: "CreatorFan",
};

describe("mapYoutubeMessage", () => {
  it("maps regular text messages", () => {
    const item: YoutubeLiveChatMessage = {
      id: "yt-1",
      authorDetails: baseAuthor,
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-07-13T21:00:00.000Z",
        textMessageDetails: { messageText: "hello youtube" },
      },
    };

    expect(mapYoutubeMessage(item, "video-1")).toMatchObject({
      platform: "youtube",
      streamId: "video-1",
      kind: "regular",
      text: "hello youtube",
    });
  });

  it("maps Super Chats with amountMicros as optional paid signal", () => {
    const item: YoutubeLiveChatMessage = {
      id: "yt-super",
      authorDetails: baseAuthor,
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-07-13T21:00:01.000Z",
        superChatDetails: {
          amountMicros: "5000000",
          currency: "USD",
          userComment: "Love the stream",
        },
      },
    };

    expect(mapYoutubeMessage(item, "video-1")).toEqual({
      platform: "youtube",
      streamId: "video-1",
      messageId: "yt-super",
      userId: "UC123",
      username: "CreatorFan",
      text: "Love the stream",
      occurredAt: "2026-07-13T21:00:01.000Z",
      kind: "super_chat",
      amountMicros: 5_000_000,
      currency: "USD",
    });
  });

  it("maps membership events without requiring an amount", () => {
    const item: YoutubeLiveChatMessage = {
      id: "yt-member",
      authorDetails: baseAuthor,
      snippet: {
        type: "newSponsorEvent",
        publishedAt: "2026-07-13T21:00:02.000Z",
        displayMessage: "Welcome to the club!",
        newSponsorDetails: { memberLevelName: "Gold" },
      },
    };

    expect(mapYoutubeMessage(item, "video-1")).toMatchObject({
      kind: "membership",
      text: "Welcome to the club!",
    });
  });
});

describe("YoutubeChatAdapter", () => {
  it("polls using pollingIntervalMillis and emits mapped messages", async () => {
    const received: string[] = [];
    let adapter!: YoutubeChatAdapter;

    const sleep = vi.fn(async (ms: number) => {
      expect(ms).toBe(1500);
      await adapter.disconnect();
    });

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        pollingIntervalMillis: 1500,
        items: [
          {
            id: "m1",
            authorDetails: baseAuthor,
            snippet: {
              type: "textMessageEvent",
              publishedAt: "2026-07-13T21:10:00.000Z",
              textMessageDetails: { messageText: "poll hit" },
            },
          },
        ],
      }),
    }));

    adapter = new YoutubeChatAdapter({
      apiKey: "test-key",
      liveChatId: "chat-1",
      fetchImpl,
      sleep,
      quotaScheduler: new YoutubeQuotaScheduler({ dailyBudget: 100 }),
    });

    adapter.onMessage((message) => {
      received.push(message.text);
    });

    await adapter.connect("video-1");
    await vi.waitFor(() => expect(received).toContain("poll hit"));
    await vi.waitFor(() => expect(sleep).toHaveBeenCalledWith(1500));

    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("liveChat/messages");
    expect(calledUrl).toContain("liveChatId=chat-1");
  });

  it("routes list calls through the quota scheduler", async () => {
    const schedule = vi.fn(async (fn: () => Promise<unknown>) => fn());
    const quotaScheduler = {
      schedule,
      remaining: 100,
      consumed: 0,
      setConsumed: vi.fn(),
      canAfford: vi.fn(),
    } as unknown as YoutubeQuotaScheduler;

    const adapter = new YoutubeChatAdapter({
      apiKey: "test-key",
      liveChatId: "chat-1",
      quotaScheduler,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ pollingIntervalMillis: 10, items: [] }),
      }),
      sleep: async () => {
        // Stop further polling after the first interval wait.
      },
    });

    adapter.onMessage(() => undefined);
    await adapter.connect("video-1");
    await vi.waitFor(() => expect(schedule).toHaveBeenCalled());
    await adapter.disconnect();
  });
});
