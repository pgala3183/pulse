import type {
  ChatMessageHandler,
  ChatPlatform,
  ChatSource,
  NormalizedChatMessage,
} from "./chat-source";

export type TwitchClientLike = {
  connect: () => Promise<[string, number]>;
  disconnect: () => Promise<[string, number] | void>;
  join: (channel: string) => Promise<[string] | void>;
  on: (event: string, listener: (...args: never[]) => void) => void;
  removeAllListeners: (event?: string) => void;
};

export type TwitchClientFactory = (options: {
  channels: string[];
}) => TwitchClientLike;

export type TwitchChatAdapterOptions = {
  /** Twitch channel login (without #). Defaults to streamId when omitted at connect. */
  channel?: string;
  username?: string;
  password?: string;
  createClient?: TwitchClientFactory;
  /** Base delay (ms) before first reconnect attempt. */
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  maxReconnectAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  logger?: {
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  };
};

type TwitchUserstate = {
  id?: string;
  username?: string;
  "display-name"?: string;
  "user-id"?: string;
  "tmi-sent-ts"?: string;
};

/**
 * Twitch IRC/WebSocket chat adapter (tmi.js) with exponential reconnect/backoff.
 */
export class TwitchChatAdapter implements ChatSource {
  readonly platform: ChatPlatform = "twitch";

  private readonly createClient: TwitchClientFactory;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: NonNullable<TwitchChatAdapterOptions["logger"]>;
  private readonly fixedChannel?: string;
  private readonly identity?: { username: string; password: string };

  private client: TwitchClientLike | null = null;
  private handler: ChatMessageHandler | null = null;
  private streamId: string | null = null;
  private channel: string | null = null;
  private intentionalDisconnect = false;
  private reconnectAttempts = 0;
  private connecting: Promise<void> | null = null;

  constructor(options: TwitchChatAdapterOptions = {}) {
    this.fixedChannel = options.channel;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 500;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 30_000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 8;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.logger =
      options.logger ??
      ({
        warn: (message, context) => console.warn(message, context ?? {}),
        error: (message, context) => console.error(message, context ?? {}),
      });
    if (options.username && options.password) {
      this.identity = { username: options.username, password: options.password };
    }
    this.createClient =
      options.createClient ??
      (({ channels }) => {
        // Lazy require so unit tests can inject a mock without loading tmi.js.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const tmi = require("tmi.js") as {
          Client: new (opts: Record<string, unknown>) => TwitchClientLike;
        };
        return new tmi.Client({
          options: { debug: false },
          connection: { reconnect: false, secure: true },
          identity: this.identity,
          channels,
        });
      });
  }

  onMessage(callback: ChatMessageHandler): void {
    this.handler = callback;
  }

  async connect(streamId: string): Promise<void> {
    if (this.connecting) {
      return this.connecting;
    }

    this.intentionalDisconnect = false;
    this.streamId = streamId;
    this.channel = (this.fixedChannel ?? streamId).replace(/^#/, "").toLowerCase();
    this.connecting = this.connectInternal();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.reconnectAttempts = 0;
    if (this.client) {
      this.client.removeAllListeners("message");
      this.client.removeAllListeners("disconnected");
      await this.client.disconnect();
      this.client = null;
    }
  }

  private async connectInternal(): Promise<void> {
    if (!this.channel || !this.streamId) {
      throw new Error("TwitchChatAdapter.connect requires a streamId");
    }

    const client = this.createClient({ channels: [this.channel] });
    this.client = client;

    client.on(
      "message",
      ((channel: string, tags: TwitchUserstate, message: string, self: boolean) => {
        if (self || !this.handler || !this.streamId) {
          return;
        }
        const normalized: NormalizedChatMessage = {
          platform: "twitch",
          streamId: this.streamId,
          messageId: tags.id ?? `${tags["user-id"] ?? "unknown"}-${String(Date.now())}`,
          userId: tags["user-id"] ?? tags.username ?? "unknown",
          username: tags["display-name"] ?? tags.username ?? "unknown",
          text: message,
          occurredAt: tags["tmi-sent-ts"]
            ? new Date(Number(tags["tmi-sent-ts"])).toISOString()
            : new Date().toISOString(),
          kind: "regular",
        };
        void Promise.resolve(this.handler(normalized)).catch((error: unknown) => {
          this.logger.error("Twitch chat handler failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
        void channel;
      }) as (...args: never[]) => void,
    );

    client.on(
      "disconnected",
      ((reason: string) => {
        void this.handleDisconnect(reason);
      }) as (...args: never[]) => void,
    );

    await client.connect();
    this.reconnectAttempts = 0;
  }

  private async handleDisconnect(reason: string): Promise<void> {
    if (this.intentionalDisconnect || !this.streamId) {
      return;
    }

    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logger.error("Twitch reconnect attempts exhausted", {
        reason,
        attempts: this.reconnectAttempts,
      });
      return;
    }

    const delay = Math.min(
      this.reconnectMaxMs,
      this.reconnectBaseMs * 2 ** (this.reconnectAttempts - 1),
    );
    this.logger.warn("Twitch connection dropped; reconnecting with backoff", {
      reason,
      attempt: this.reconnectAttempts,
      delayMs: delay,
    });
    await this.sleep(delay);

    if (this.intentionalDisconnect) {
      return;
    }

    try {
      await this.connectInternal();
    } catch (error) {
      this.logger.error("Twitch reconnect failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleDisconnect("reconnect-failed");
    }
  }
}
