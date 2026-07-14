import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TwitchChatAdapter, type TwitchClientLike } from "./twitch-chat-adapter";

class MockTwitchClient extends EventEmitter implements TwitchClientLike {
  connect = vi.fn(async () => {
    return ["server", 1] as [string, number];
  });
  disconnect = vi.fn(async () => undefined);
  join = vi.fn(async () => undefined);
  override removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }
}

describe("TwitchChatAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects, receives IRC messages, and emits normalized chat events", async () => {
    const client = new MockTwitchClient();
    const adapter = new TwitchChatAdapter({
      createClient: () => client,
    });

    const messages: unknown[] = [];
    adapter.onMessage((message) => {
      messages.push(message);
    });

    await adapter.connect("cool_streamer");
    expect(client.connect).toHaveBeenCalledOnce();

    client.emit(
      "message",
      "#cool_streamer",
      {
        id: "twitch-msg-1",
        "user-id": "u-1",
        username: "viewer",
        "display-name": "Viewer",
        "tmi-sent-ts": "1720900800000",
      },
      "hello from twitch",
      false,
    );

    expect(messages).toEqual([
      {
        platform: "twitch",
        streamId: "cool_streamer",
        messageId: "twitch-msg-1",
        userId: "u-1",
        username: "Viewer",
        text: "hello from twitch",
        occurredAt: new Date(1720900800000).toISOString(),
        kind: "regular",
      },
    ]);

    await adapter.disconnect();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it("reconnects with exponential backoff after dropped connections", async () => {
    const sleep = vi.fn(async () => undefined);
    const warn = vi.fn();
    let creations = 0;
    const clients: MockTwitchClient[] = [];

    const adapter = new TwitchChatAdapter({
      reconnectBaseMs: 100,
      maxReconnectAttempts: 2,
      sleep,
      logger: { warn, error: vi.fn() },
      createClient: () => {
        creations += 1;
        const client = new MockTwitchClient();
        clients.push(client);
        return client;
      },
    });

    await adapter.connect("channel");
    expect(creations).toBe(1);

    clients[0]?.emit("disconnected", "Ping timeout");
    await vi.waitFor(() => expect(creations).toBe(2));

    expect(sleep).toHaveBeenCalledWith(100);
    expect(warn).toHaveBeenCalledWith(
      "Twitch connection dropped; reconnecting with backoff",
      expect.objectContaining({ attempt: 1, delayMs: 100 }),
    );

    await adapter.disconnect();
  });
});
