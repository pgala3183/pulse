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

registerEnumType(Platform, { name: "Platform" });
registerEnumType(StreamIngestionStatus, { name: "StreamIngestionStatus" });
registerEnumType(SentimentLabel, { name: "SentimentLabel" });
