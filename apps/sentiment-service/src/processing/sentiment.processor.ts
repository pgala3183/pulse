import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  BrandMentionEventSchema,
  KafkaTopics,
  SentimentResultEventSchema,
  type BrandMentionEvent,
  type ChatMessageEvent,
  type SentimentResultEvent,
  type TranscriptSegmentEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import {
  MlClient,
  MlClientError,
  type BrandRelevanceResponse,
  type SentimentAnalysisResponse,
} from "@pulse/ml-client";
import { randomUUID } from "node:crypto";
import {
  lexicalAnalyzeSentiment,
  lexicalDetectBrands,
} from "../fallback/lexical-analysis";
import type { SentimentRepository } from "../db/repository";
import type { SentimentCache } from "../redis/cache";
import {
  computeSponsorRelevance,
  isPaidChatKind,
} from "../scoring/sponsor-relevance";

export const SENTIMENT_KAFKA_CLIENT = Symbol("SENTIMENT_KAFKA_CLIENT");
export const SENTIMENT_ML_CLIENT = Symbol("SENTIMENT_ML_CLIENT");
export const SENTIMENT_REPO = Symbol("SENTIMENT_REPO");
export const SENTIMENT_CACHE = Symbol("SENTIMENT_CACHE");

export type TextAnalysisInput =
  | { sourceType: "chat.message"; event: ChatMessageEvent }
  | { sourceType: "transcript.segment"; event: TranscriptSegmentEvent };

export type TextAnalysisResult = {
  sentiment: SentimentResultEvent;
  brandMentions: BrandMentionEvent[];
};

@Injectable()
export class SentimentProcessor {
  private readonly logger = new Logger(SentimentProcessor.name);

  constructor(
    @Inject(SENTIMENT_ML_CLIENT) private readonly ml: MlClient,
    @Inject(SENTIMENT_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(SENTIMENT_REPO) private readonly repo: SentimentRepository,
    @Inject(SENTIMENT_CACHE) private readonly cache: SentimentCache,
  ) {}

  async process(input: TextAnalysisInput): Promise<TextAnalysisResult> {
    const text =
      input.sourceType === "chat.message" ? input.event.text : input.event.text;
    const { sentiment: mlSentiment, brands: mlBrands, analysisSource } =
      await this.resolveAnalysis(text, input.event.platform);

    const paid =
      input.sourceType === "chat.message"
        ? isPaidChatKind(input.event.kind)
        : false;

    const sponsorRelevance = computeSponsorRelevance({
      sentimentScore: mlSentiment.score,
      brandMatches: mlBrands.matches.map((match) => ({
        brand: match.brand,
        confidence: match.confidence,
        relevance: match.relevance,
      })),
      isPaidSignal: paid,
    });

    const sentimentEvent: SentimentResultEvent = {
      eventId: randomUUID(),
      type: "sentiment.result",
      platform: input.event.platform,
      streamId: input.event.streamId,
      occurredAt: input.event.occurredAt,
      sourceEventId: input.event.eventId,
      sourceType: input.sourceType,
      label: mlSentiment.label,
      score: mlSentiment.score,
      confidence: mlSentiment.confidence,
      sponsorRelevance,
      analysisSource,
    };

    await this.repo.insert({
      id: sentimentEvent.eventId,
      eventId: sentimentEvent.eventId,
      streamId: sentimentEvent.streamId,
      platform: sentimentEvent.platform,
      sourceEventId: sentimentEvent.sourceEventId,
      sourceType: sentimentEvent.sourceType,
      label: sentimentEvent.label,
      score: sentimentEvent.score,
      confidence: sentimentEvent.confidence,
      sponsorRelevance,
      analysisSource,
      payload: { input, mlSentiment, mlBrands },
    });

    await this.cache.setLatest(sentimentEvent.streamId, {
      ...sentimentEvent,
    });

    await this.kafka.publishTyped(
      KafkaTopics.SENTIMENT_RESULTS,
      SentimentResultEventSchema,
      sentimentEvent,
      { key: sentimentEvent.streamId },
    );

    const brandMentions: BrandMentionEvent[] = [];
    for (const match of mlBrands.matches) {
      const mention: BrandMentionEvent = {
        eventId: randomUUID(),
        type: "brand.mention",
        platform: input.event.platform,
        streamId: input.event.streamId,
        occurredAt: input.event.occurredAt,
        sourceEventId: input.event.eventId,
        sourceType: input.sourceType,
        brand: match.brand,
        mentionText: match.mentionText,
        confidence: match.confidence,
        analysisSource,
        ...(input.sourceType === "transcript.segment"
          ? { startMs: input.event.startMs, endMs: input.event.endMs }
          : {}),
      };
      await this.kafka.publishTyped(
        KafkaTopics.BRAND_MENTIONS,
        BrandMentionEventSchema,
        mention,
        { key: mention.streamId },
      );
      brandMentions.push(mention);
    }

    return { sentiment: sentimentEvent, brandMentions };
  }

  private async resolveAnalysis(
    text: string,
    platform: "twitch" | "youtube",
  ): Promise<{
    sentiment: SentimentAnalysisResponse;
    brands: BrandRelevanceResponse;
    analysisSource: "ml" | "lexical_fallback";
  }> {
    try {
      const [sentiment, brands] = await Promise.all([
        this.ml.analyzeSentiment({ text, platform }),
        this.ml.analyzeBrandRelevance({ text }),
      ]);

      const low =
        this.ml.isLowConfidence(sentiment.confidence) ||
        this.ml.isLowConfidence(brands.confidence);

      if (!low) {
        return { sentiment, brands, analysisSource: "ml" };
      }

      this.logger.warn("ML sentiment/brand confidence low; using lexical fallback");
    } catch (error) {
      this.logger.warn("ML sentiment/brand call failed; using lexical fallback", {
        error:
          error instanceof MlClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error),
      });
    }

    const sentiment = lexicalAnalyzeSentiment(text);
    const matches = lexicalDetectBrands(text);
    return {
      sentiment,
      brands: {
        matches,
        confidence: matches[0]?.confidence ?? 0.4,
      },
      analysisSource: "lexical_fallback",
    };
  }
}
