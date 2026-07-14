import type {
  ChatMessageHandler,
  ChatMessageKind,
  ChatPlatform,
  ChatSource,
  NormalizedChatMessage,
} from "./chat-source";
import {
  YOUTUBE_LIVE_CHAT_LIST_COST,
  YoutubeQuotaScheduler,
  type YoutubeQuotaSchedulerOptions,
} from "./youtube-quota";

export type YoutubeLiveChatMessage = {
  id: string;
  snippet: {
    type: string;
    publishedAt: string;
    displayMessage?: string;
    textMessageDetails?: { messageText: string };
    superChatDetails?: {
      amountMicros: string;
      currency: string;
      userComment?: string;
    };
    memberMilestoneChatDetails?: {
      memberMonth?: string;
      userComment?: string;
    };
    newSponsorDetails?: {
      isUpgrade?: boolean;
      memberLevelName?: string;
    };
  };
  authorDetails: {
    channelId: string;
    displayName: string;
  };
};

export type YoutubeLiveChatListResponse = {
  items?: YoutubeLiveChatMessage[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
};

export type YoutubeFetch = (
  url: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type YoutubeChatAdapterOptions = {
  apiKey: string;
  /** Live chat ID. If omitted, resolve from `videos.list` using streamId as video ID. */
  liveChatId?: string;
  fetchImpl?: YoutubeFetch;
  quotaScheduler?: YoutubeQuotaScheduler;
  quotaOptions?: YoutubeQuotaSchedulerOptions;
  sleep?: (ms: number) => Promise<void>;
  logger?: {
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  };
};

const DEFAULT_POLL_MS = 5_000;
const API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube live chat adapter using liveChatMessages.list polling.
 * Respects `pollingIntervalMillis` and routes calls through a quota scheduler.
 */
export class YoutubeChatAdapter implements ChatSource {
  readonly platform: ChatPlatform = "youtube";

  private readonly apiKey: string;
  private readonly fetchImpl: YoutubeFetch;
  private readonly quota: YoutubeQuotaScheduler;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: NonNullable<YoutubeChatAdapterOptions["logger"]>;
  private readonly configuredLiveChatId?: string;

  private handler: ChatMessageHandler | null = null;
  private streamId: string | null = null;
  private liveChatId: string | null = null;
  private pageToken: string | undefined;
  private running = false;
  private pollLoop: Promise<void> | null = null;

  constructor(options: YoutubeChatAdapterOptions) {
    this.apiKey = options.apiKey;
    this.configuredLiveChatId = options.liveChatId;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
    this.quota =
      options.quotaScheduler ??
      new YoutubeQuotaScheduler(options.quotaOptions);
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.logger =
      options.logger ??
      ({
        warn: (message, context) => console.warn(message, context ?? {}),
        error: (message, context) => console.error(message, context ?? {}),
      });
  }

  onMessage(callback: ChatMessageHandler): void {
    this.handler = callback;
  }

  async connect(streamId: string): Promise<void> {
    this.streamId = streamId;
    this.liveChatId =
      this.configuredLiveChatId ?? (await this.resolveLiveChatId(streamId));
    this.pageToken = undefined;
    this.running = true;
    this.pollLoop = this.runPollLoop();
  }

  async disconnect(): Promise<void> {
    this.running = false;
    // Avoid awaiting the poll loop — it may be parked in `sleep()` that
    // itself triggers disconnect (deadlock). The loop exits on next `running` check.
    this.pollLoop = null;
  }

  private async runPollLoop(): Promise<void> {
    while (this.running) {
      try {
        const response = await this.quota.schedule(
          () => this.fetchLiveChatPage(),
          YOUTUBE_LIVE_CHAT_LIST_COST,
        );
        await this.emitMessages(response.items ?? []);
        this.pageToken = response.nextPageToken;
        const waitMs = response.pollingIntervalMillis ?? DEFAULT_POLL_MS;
        await this.sleep(waitMs);
      } catch (error) {
        this.logger.error("YouTube live chat poll failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        await this.sleep(DEFAULT_POLL_MS);
      }
    }
  }

  private async resolveLiveChatId(videoId: string): Promise<string> {
    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set("part", "liveStreamingDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchImpl(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube videos.list failed with status ${String(response.status)}`);
    }
    const body = (await response.json()) as {
      items?: Array<{ liveStreamingDetails?: { activeLiveChatId?: string } }>;
    };
    const liveChatId = body.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!liveChatId) {
      throw new Error(`No active live chat found for YouTube video ${videoId}`);
    }
    return liveChatId;
  }

  private async fetchLiveChatPage(): Promise<YoutubeLiveChatListResponse> {
    if (!this.liveChatId) {
      throw new Error("YouTubeChatAdapter is not connected");
    }

    const url = new URL(`${API_BASE}/liveChat/messages`);
    url.searchParams.set("part", "snippet,authorDetails");
    url.searchParams.set("liveChatId", this.liveChatId);
    url.searchParams.set("key", this.apiKey);
    if (this.pageToken) {
      url.searchParams.set("pageToken", this.pageToken);
    }

    const response = await this.fetchImpl(url.toString());
    if (!response.ok) {
      throw new Error(
        `YouTube liveChatMessages.list failed with status ${String(response.status)}`,
      );
    }
    return (await response.json()) as YoutubeLiveChatListResponse;
  }

  private async emitMessages(items: YoutubeLiveChatMessage[]): Promise<void> {
    if (!this.handler || !this.streamId) {
      return;
    }

    for (const item of items) {
      const normalized = mapYoutubeMessage(item, this.streamId);
      if (!normalized) {
        continue;
      }
      await this.handler(normalized);
    }
  }
}

export function mapYoutubeMessage(
  item: YoutubeLiveChatMessage,
  streamId: string,
): NormalizedChatMessage | null {
  const kind = mapYoutubeKind(item.snippet.type);
  if (kind === null) {
    return null;
  }

  const text = resolveMessageText(item);
  const amount = parseAmount(item);

  return {
    platform: "youtube",
    streamId,
    messageId: item.id,
    userId: item.authorDetails.channelId,
    username: item.authorDetails.displayName,
    text,
    occurredAt: item.snippet.publishedAt,
    kind,
    ...(amount
      ? { amountMicros: amount.amountMicros, currency: amount.currency }
      : {}),
  };
}

function mapYoutubeKind(type: string): ChatMessageKind | null {
  switch (type) {
    case "textMessageEvent":
      return "regular";
    case "superChatEvent":
    case "superStickerEvent":
      return "super_chat";
    case "newSponsorEvent":
    case "memberMilestoneChatEvent":
    case "membershipGiftingEvent":
    case "giftMembershipReceivedEvent":
      return "membership";
    case "messageDeletedEvent":
    case "userBannedEvent":
    case "chatEndedEvent":
    case "sponsorOnlyModeStartedEvent":
    case "sponsorOnlyModeEndedEvent":
    case "tombstone":
      return null;
    default:
      return "other";
  }
}

function resolveMessageText(item: YoutubeLiveChatMessage): string {
  if (item.snippet.superChatDetails?.userComment) {
    return item.snippet.superChatDetails.userComment;
  }
  if (item.snippet.memberMilestoneChatDetails?.userComment) {
    return item.snippet.memberMilestoneChatDetails.userComment;
  }
  if (item.snippet.textMessageDetails?.messageText) {
    return item.snippet.textMessageDetails.messageText;
  }
  if (item.snippet.displayMessage) {
    return item.snippet.displayMessage;
  }
  if (item.snippet.newSponsorDetails?.memberLevelName) {
    return `New membership: ${item.snippet.newSponsorDetails.memberLevelName}`;
  }
  return "";
}

function parseAmount(
  item: YoutubeLiveChatMessage,
): { amountMicros: number; currency: string } | undefined {
  const details = item.snippet.superChatDetails;
  if (!details) {
    return undefined;
  }
  const amountMicros = Number(details.amountMicros);
  if (!Number.isFinite(amountMicros) || amountMicros < 0) {
    return undefined;
  }
  return { amountMicros, currency: details.currency };
}
