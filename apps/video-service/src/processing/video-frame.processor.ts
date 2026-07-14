import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  BrandMentionEventSchema,
  type BrandMentionEvent,
  type VideoFrameEvent,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { MlClient, MlClientError, type SponsorDetectionResponse } from "@pulse/ml-client";
import { KafkaTopics } from "@pulse/event-schemas";
import { randomUUID } from "node:crypto";
import {
  type DetectionRecord,
  type SponsorDetectionRepository,
} from "../db/repository";
import { lexicalDetectSponsors } from "../fallback/lexical-sponsors";

export const VIDEO_KAFKA_CLIENT = Symbol("VIDEO_KAFKA_CLIENT");
export const VIDEO_ML_CLIENT = Symbol("VIDEO_ML_CLIENT");
export const SPONSOR_DETECTION_REPO = Symbol("SPONSOR_DETECTION_REPO");

export type ProcessFrameOptions = {
  /** Extra text for lexical fallback (tests / OCR side-channel). */
  lexicalHint?: string;
};

@Injectable()
export class VideoFrameProcessor {
  private readonly logger = new Logger(VideoFrameProcessor.name);

  constructor(
    @Inject(VIDEO_ML_CLIENT) private readonly ml: MlClient,
    @Inject(VIDEO_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(SPONSOR_DETECTION_REPO) private readonly repo: SponsorDetectionRepository,
  ) {}

  async processFrame(
    frame: VideoFrameEvent,
    options: ProcessFrameOptions = {},
  ): Promise<BrandMentionEvent[]> {
    const { detections, analysisSource, confidence } = await this.resolveDetections(
      frame,
      options.lexicalHint,
    );

    const published: BrandMentionEvent[] = [];

    for (const detection of detections) {
      const event: BrandMentionEvent = {
        eventId: randomUUID(),
        type: "brand.mention",
        platform: frame.platform,
        streamId: frame.streamId,
        occurredAt: frame.occurredAt,
        sourceEventId: frame.eventId,
        sourceType: "video.frame",
        brand: detection.brand,
        mentionText: detection.mentionText,
        confidence: detection.confidence,
        analysisSource,
      };

      const record: DetectionRecord = {
        id: event.eventId,
        eventId: frame.eventId,
        streamId: frame.streamId,
        platform: frame.platform,
        frameId: frame.frameId,
        brand: detection.brand,
        mentionText: detection.mentionText,
        confidence: detection.confidence,
        analysisSource,
        payload: { frame, detection, mlConfidence: confidence },
      };

      await this.repo.insert(record);
      await this.kafka.publishTyped(
        KafkaTopics.BRAND_MENTIONS,
        BrandMentionEventSchema,
        event,
        { key: frame.streamId },
      );
      published.push(event);
    }

    return published;
  }

  private async resolveDetections(
    frame: VideoFrameEvent,
    lexicalHint?: string,
  ): Promise<{
    detections: Array<{ brand: string; mentionText: string; confidence: number }>;
    analysisSource: "ml" | "lexical_fallback";
    confidence: number;
  }> {
    try {
      const response: SponsorDetectionResponse = await this.ml.detectSponsors({
        streamId: frame.streamId,
        frameId: frame.frameId,
        payloadRef: frame.payloadRef,
        mimeType: frame.mimeType,
      });

      if (!this.ml.isLowConfidence(response.confidence) && response.detections.length > 0) {
        return {
          detections: response.detections.map((d) => ({
            brand: d.brand,
            mentionText: d.mentionText,
            confidence: d.confidence,
          })),
          analysisSource: "ml",
          confidence: response.confidence,
        };
      }

      this.logger.warn("ML sponsor detection low confidence; using lexical fallback", {
        frameId: frame.frameId,
        confidence: response.confidence,
      });
    } catch (error) {
      this.logger.warn("ML sponsor detection failed; using lexical fallback", {
        frameId: frame.frameId,
        error:
          error instanceof MlClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error),
      });
    }

    const text = [lexicalHint ?? "", frame.payloadRef, frame.frameId].join(" ");
    const fallback = lexicalDetectSponsors(text);
    return {
      detections: fallback,
      analysisSource: "lexical_fallback",
      confidence: fallback[0]?.confidence ?? 0,
    };
  }
}
