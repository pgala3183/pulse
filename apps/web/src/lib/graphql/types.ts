export type Platform = "TWITCH" | "YOUTUBE";

export type StreamIngestionStatus =
  | "IDLE"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "STOPPED";

export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export type ChatMessageKind = "REGULAR" | "SUPER_CHAT" | "MEMBERSHIP" | "OTHER";

export type RecommendationSeverity = "INFO" | "WARNING" | "ACTION";

export interface StreamIngestion {
  streamId: string;
  platform: Platform;
  targetId: string;
  status: StreamIngestionStatus;
  updatedAt: string;
}

export interface ChatMessage {
  eventId: string;
  username: string;
  text: string;
  kind: ChatMessageKind;
  occurredAt: string;
  amountMicros?: number | null;
  currency?: string | null;
}

export interface SentimentResult {
  eventId: string;
  label: SentimentLabel;
  score: number;
  confidence: number;
  occurredAt: string;
  sourceType: string;
}

export interface BrandMention {
  eventId: string;
  brand: string;
  mentionText: string;
  confidence: number;
  occurredAt: string;
  sourceType: string;
}

export interface AnalyticsSummary {
  streamId: string;
  platform: Platform;
  chatMessageCount: number;
  sentimentSampleCount: number;
  averageSentimentScore: number;
  brandMentionCount: number;
  topBrands: string[];
  windowStartedAt: string;
  windowEndedAt: string;
}

export interface Recommendation {
  eventId: string;
  code: string;
  severity: RecommendationSeverity;
  title: string;
  summary: string;
  relatedBrands: string[];
  occurredAt: string;
  windowType?: string | null;
}

export interface DashboardQueryData {
  streamIngestion: StreamIngestion | null;
  liveChat: ChatMessage[];
  liveSentiment: SentimentResult[];
  liveBrandMentions: BrandMention[];
  analyticsSummary: AnalyticsSummary;
  liveRecommendations: Recommendation[];
}

export interface StartIngestionData {
  startStreamIngestion: StreamIngestion;
}

export interface StopIngestionData {
  stopStreamIngestion: StreamIngestion;
}

export interface ChatSubData {
  chatMessageUpdates: ChatMessage;
}

export interface SentimentSubData {
  sentimentUpdates: SentimentResult;
}

export interface BrandSubData {
  brandMentionUpdates: BrandMention;
}

export interface RecommendationSubData {
  recommendationUpdates: Recommendation;
}
