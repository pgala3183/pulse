export type ChatPlatform = "twitch" | "youtube";

export type ChatMessageKind = "regular" | "super_chat" | "membership" | "other";

/**
 * Platform-normalized chat message. Downstream services map this onto
 * `ChatMessageEvent` without caring which adapter produced it.
 */
export type NormalizedChatMessage = {
  platform: ChatPlatform;
  streamId: string;
  messageId: string;
  userId: string;
  username: string;
  text: string;
  occurredAt: string;
  kind: ChatMessageKind;
  amountMicros?: number;
  currency?: string;
};

export type ChatMessageHandler = (
  message: NormalizedChatMessage,
) => void | Promise<void>;

/**
 * Shared chat ingestion adapter. Implementations wrap Twitch IRC/WebSocket or
 * YouTube liveChatMessages polling behind one contract.
 */
export interface ChatSource {
  readonly platform: ChatPlatform;
  connect(streamId: string): Promise<void>;
  onMessage(callback: ChatMessageHandler): void;
  disconnect(): Promise<void>;
}
