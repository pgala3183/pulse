import { Injectable } from "@nestjs/common";
import type {
  BrandMentionEvent,
  ChatMessageEvent,
  RecommendationEvent,
  SentimentResultEvent,
} from "@pulse/event-schemas";
import {
  ChatMessageKind,
  Platform,
  RecommendationSeverity,
  SentimentLabel,
  StreamIngestionStatus,
} from "../graphql/enums";
import type {
  AnalyticsSummary,
  BrandMention,
  ChatMessage,
  Recommendation,
  SentimentResult,
  StreamIngestion,
} from "../graphql/models";

@Injectable()
export class GatewayStore {
  private readonly ingestions = new Map<string, StreamIngestion>();
  private readonly sentiments = new Map<string, SentimentResult[]>();
  private readonly brandMentions = new Map<string, BrandMention[]>();
  private readonly chatMessages = new Map<string, ChatMessage[]>();
  private readonly recommendations = new Map<string, Recommendation[]>();

  upsertIngestion(ingestion: StreamIngestion): StreamIngestion {
    this.ingestions.set(this.key(ingestion.platform, ingestion.streamId), ingestion);
    return ingestion;
  }

  getIngestion(platform: Platform, streamId: string): StreamIngestion | undefined {
    return this.ingestions.get(this.key(platform, streamId));
  }

  listIngestions(): StreamIngestion[] {
    return [...this.ingestions.values()];
  }

  setIngestionStatus(
    platform: Platform,
    streamId: string,
    status: StreamIngestionStatus,
  ): StreamIngestion | undefined {
    const current = this.getIngestion(platform, streamId);
    if (!current) {
      return undefined;
    }
    const updated: StreamIngestion = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };
    return this.upsertIngestion(updated);
  }

  addSentiment(event: SentimentResultEvent): SentimentResult {
    const mapped = this.mapSentiment(event);
    const list = this.sentiments.get(event.streamId) ?? [];
    list.push(mapped);
    this.sentiments.set(event.streamId, list.slice(-500));
    return mapped;
  }

  listSentiments(streamId: string, limit = 50): SentimentResult[] {
    const list = this.sentiments.get(streamId) ?? [];
    return list.slice(-limit).reverse();
  }

  addBrandMention(event: BrandMentionEvent): BrandMention {
    const mapped = this.mapBrandMention(event);
    const list = this.brandMentions.get(event.streamId) ?? [];
    list.push(mapped);
    this.brandMentions.set(event.streamId, list.slice(-500));
    return mapped;
  }

  listBrandMentions(streamId: string, limit = 50): BrandMention[] {
    const list = this.brandMentions.get(streamId) ?? [];
    return list.slice(-limit).reverse();
  }

  addChatMessage(event: ChatMessageEvent): ChatMessage {
    const mapped = this.mapChatMessage(event);
    const list = this.chatMessages.get(event.streamId) ?? [];
    list.push(mapped);
    this.chatMessages.set(event.streamId, list.slice(-500));
    return mapped;
  }

  listChatMessages(streamId: string, limit = 50): ChatMessage[] {
    const list = this.chatMessages.get(streamId) ?? [];
    return list.slice(-limit).reverse();
  }

  addRecommendation(event: RecommendationEvent): Recommendation {
    const mapped = this.mapRecommendation(event);
    const list = this.recommendations.get(event.streamId) ?? [];
    list.push(mapped);
    this.recommendations.set(event.streamId, list.slice(-200));
    return mapped;
  }

  listRecommendations(streamId: string, limit = 50): Recommendation[] {
    const list = this.recommendations.get(streamId) ?? [];
    return list.slice(-limit).reverse();
  }

  getAnalyticsSummary(streamId: string, platform: Platform): AnalyticsSummary {
    const sentiments = this.sentiments.get(streamId) ?? [];
    const mentions = this.brandMentions.get(streamId) ?? [];
    const chats = this.chatMessages.get(streamId) ?? [];
    const averageSentimentScore =
      sentiments.length === 0
        ? 0
        : sentiments.reduce((sum, item) => sum + item.score, 0) / sentiments.length;

    const brandCounts = new Map<string, number>();
    for (const mention of mentions) {
      brandCounts.set(mention.brand, (brandCounts.get(mention.brand) ?? 0) + 1);
    }
    const topBrands = [...brandCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand);

    const timestamps = [
      ...sentiments.map((item) => item.occurredAt),
      ...mentions.map((item) => item.occurredAt),
      ...chats.map((item) => item.occurredAt),
    ].sort();

    return {
      streamId,
      platform,
      chatMessageCount: chats.length,
      sentimentSampleCount: sentiments.length,
      averageSentimentScore,
      brandMentionCount: mentions.length,
      topBrands,
      windowStartedAt: timestamps[0] ?? new Date(0).toISOString(),
      windowEndedAt: timestamps[timestamps.length - 1] ?? new Date(0).toISOString(),
    };
  }

  private mapSentiment(event: SentimentResultEvent): SentimentResult {
    return {
      eventId: event.eventId,
      platform: event.platform as Platform,
      streamId: event.streamId,
      occurredAt: event.occurredAt,
      sourceEventId: event.sourceEventId,
      sourceType: event.sourceType,
      label: event.label as SentimentLabel,
      score: event.score,
      confidence: event.confidence,
    };
  }

  private mapBrandMention(event: BrandMentionEvent): BrandMention {
    return {
      eventId: event.eventId,
      platform: event.platform as Platform,
      streamId: event.streamId,
      occurredAt: event.occurredAt,
      sourceEventId: event.sourceEventId,
      sourceType: event.sourceType,
      brand: event.brand,
      mentionText: event.mentionText,
      confidence: event.confidence,
      startMs: event.startMs ?? null,
      endMs: event.endMs ?? null,
    };
  }

  private mapChatMessage(event: ChatMessageEvent): ChatMessage {
    return {
      eventId: event.eventId,
      platform: event.platform as Platform,
      streamId: event.streamId,
      occurredAt: event.occurredAt,
      messageId: event.messageId,
      userId: event.userId,
      username: event.username,
      text: event.text,
      kind: event.kind as ChatMessageKind,
      amountMicros: event.amountMicros ?? null,
      currency: event.currency ?? null,
    };
  }

  private mapRecommendation(event: RecommendationEvent): Recommendation {
    return {
      eventId: event.eventId,
      platform: event.platform as Platform,
      streamId: event.streamId,
      occurredAt: event.occurredAt,
      code: event.code,
      severity: event.severity as RecommendationSeverity,
      title: event.title,
      summary: event.summary,
      relatedBrands: event.relatedBrands,
      windowType: event.windowType ?? null,
    };
  }

  private key(platform: Platform, streamId: string): string {
    return `${platform}:${streamId}`;
  }
}
