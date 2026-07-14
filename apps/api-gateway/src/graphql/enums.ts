import { registerEnumType } from "@nestjs/graphql";

export enum Platform {
  TWITCH = "twitch",
  YOUTUBE = "youtube",
}

export enum StreamIngestionStatus {
  IDLE = "idle",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  STOPPED = "stopped",
}

export enum SentimentLabel {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

export enum ChatMessageKind {
  REGULAR = "regular",
  SUPER_CHAT = "super_chat",
  MEMBERSHIP = "membership",
  OTHER = "other",
}

export enum RecommendationSeverity {
  INFO = "info",
  WARNING = "warning",
  ACTION = "action",
}

registerEnumType(Platform, { name: "Platform" });
registerEnumType(StreamIngestionStatus, { name: "StreamIngestionStatus" });
registerEnumType(SentimentLabel, { name: "SentimentLabel" });
registerEnumType(ChatMessageKind, { name: "ChatMessageKind" });
registerEnumType(RecommendationSeverity, { name: "RecommendationSeverity" });
