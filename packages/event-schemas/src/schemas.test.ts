import { describe, expect, it } from "vitest";
import {
  BrandMentionEventSchema,
  ChatMessageEventSchema,
  IngestionCommandEventSchema,
  SentimentResultEventSchema,
  TranscriptSegmentEventSchema,
  VideoFrameEventSchema,
} from "./index";

const baseStreamFields = {
  eventId: "550e8400-e29b-41d4-a716-446655440000",
  platform: "twitch" as const,
  streamId: "stream-123",
  occurredAt: "2026-07-13T20:00:00.000Z",
};

describe("ChatMessageEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    type: "chat.message" as const,
    messageId: "msg-1",
    userId: "user-1",
    username: "viewer",
    text: "hello chat",
    kind: "regular" as const,
  };

  it("accepts a valid payload", () => {
    expect(ChatMessageEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = ChatMessageEventSchema.safeParse({ ...valid, platform: "tiktok" });
    expect(result.success).toBe(false);
  });

  it("accepts Super Chat amount fields", () => {
    const result = ChatMessageEventSchema.safeParse({
      ...valid,
      kind: "super_chat",
      amountMicros: 5_000_000,
      currency: "USD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMicros).toBe(5_000_000);
      expect(result.data.kind).toBe("super_chat");
    }
  });
});

describe("VideoFrameEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    type: "video.frame" as const,
    frameId: "frame-1",
    sequenceNumber: 0,
    width: 1920,
    height: 1080,
    mimeType: "image/jpeg",
    payloadRef: "s3://pulse/frames/frame-1.jpg",
  };

  it("accepts a valid payload", () => {
    expect(VideoFrameEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = VideoFrameEventSchema.safeParse({ ...valid, width: -1 });
    expect(result.success).toBe(false);
  });
});

describe("TranscriptSegmentEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    platform: "youtube" as const,
    type: "transcript.segment" as const,
    segmentId: "seg-1",
    text: "welcome to the stream",
    startMs: 0,
    endMs: 1500,
    language: "en",
    confidence: 0.92,
  };

  it("accepts a valid payload", () => {
    expect(TranscriptSegmentEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = TranscriptSegmentEventSchema.safeParse({
      ...valid,
      endMs: 100,
      startMs: 500,
    });
    expect(result.success).toBe(false);
  });
});

describe("SentimentResultEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    type: "sentiment.result" as const,
    sourceEventId: "550e8400-e29b-41d4-a716-446655440001",
    sourceType: "chat.message" as const,
    label: "positive" as const,
    score: 0.8,
    confidence: 0.95,
  };

  it("accepts a valid payload", () => {
    expect(SentimentResultEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = SentimentResultEventSchema.safeParse({ ...valid, score: 2 });
    expect(result.success).toBe(false);
  });
});

describe("BrandMentionEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    type: "brand.mention" as const,
    sourceEventId: "550e8400-e29b-41d4-a716-446655440002",
    sourceType: "transcript.segment" as const,
    brand: "Acme",
    mentionText: "sponsored by Acme",
    confidence: 0.88,
    startMs: 1200,
    endMs: 2400,
  };

  it("accepts a valid payload", () => {
    expect(BrandMentionEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = BrandMentionEventSchema.safeParse({ ...valid, brand: "" });
    expect(result.success).toBe(false);
  });
});

describe("IngestionCommandEventSchema", () => {
  const valid = {
    ...baseStreamFields,
    type: "ingestion.command" as const,
    action: "start" as const,
    targetId: "cool_streamer",
  };

  it("accepts a valid payload", () => {
    expect(IngestionCommandEventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payload", () => {
    const result = IngestionCommandEventSchema.safeParse({ ...valid, action: "pause" });
    expect(result.success).toBe(false);
  });
});
