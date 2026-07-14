/**
 * Demo seed — publish a synthetic live stream session to Kafka and register
 * ingestion on the API gateway so the dashboard / pipeline can be demoed
 * without a real Twitch or YouTube stream.
 *
 * Usage: pnpm demo-seed   (or: make demo-seed)
 */
import { randomUUID } from "node:crypto";
import { Kafka, logLevel } from "kafkajs";
import {
  AnalyticsRollupEventSchema,
  BrandMentionEventSchema,
  ChatMessageEventSchema,
  KafkaTopics,
  RecommendationEventSchema,
  SentimentResultEventSchema,
  type AnalyticsRollupEvent,
  type BrandMentionEvent,
  type ChatMessageEvent,
  type RecommendationEvent,
  type SentimentResultEvent,
} from "@pulse/event-schemas";

const STREAM_ID = process.env["DEMO_STREAM_ID"] ?? "demo-stream";
const PLATFORM = (process.env["DEMO_PLATFORM"] ?? "twitch") as "twitch" | "youtube";
const TARGET_ID = process.env["DEMO_TARGET_ID"] ?? "cool_streamer";
const BROKERS = (process.env["KAFKA_BROKERS"] ?? "localhost:9092").split(",");
const GATEWAY_URL = process.env["GATEWAY_URL"] ?? "http://localhost:3000/graphql";
const API_KEY = process.env["PULSE_API_KEY"] ?? "dev-api-key";

const CHAT_LINES = [
  { username: "nova", text: "let's gooo Acme drop!", kind: "regular" as const },
  { username: "pixel", text: "this stream is fire", kind: "regular" as const },
  {
    username: "patron",
    text: "Super Chat for PulsePay",
    kind: "super_chat" as const,
    amountMicros: 5_000_000,
    currency: "USD",
  },
  { username: "skeptic", text: "meh mid segment", kind: "regular" as const },
  { username: "fan", text: "NovaEnergy collab when?", kind: "regular" as const },
];

async function publishJson(
  send: (topic: string, value: string) => Promise<void>,
  topic: string,
  payload: unknown,
): Promise<void> {
  await send(topic, JSON.stringify(payload));
}

async function startIngestion(): Promise<void> {
  const query = `
    mutation Start($input: StartStreamIngestionInput!) {
      startStreamIngestion(input: $input) {
        streamId
        platform
        status
        targetId
      }
    }
  `;
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          platform: PLATFORM.toUpperCase(),
          streamId: STREAM_ID,
          targetId: TARGET_ID,
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gateway HTTP ${String(response.status)}`);
  }
  const body = (await response.json()) as {
    data?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  console.log("Registered ingestion:", body.data);
}

async function main(): Promise<void> {
  console.log(`Seeding demo session streamId=${STREAM_ID} platform=${PLATFORM}`);

  try {
    await startIngestion();
  } catch (error) {
    console.warn(
      "Gateway ingestion mutation skipped (is api-gateway up?):",
      error instanceof Error ? error.message : error,
    );
  }

  const kafka = new Kafka({
    clientId: "pulse-demo-seed",
    brokers: BROKERS,
    logLevel: logLevel.ERROR,
  });
  const producer = kafka.producer();
  await producer.connect();

  const send = async (topic: string, value: string): Promise<void> => {
    await producer.send({
      topic,
      messages: [{ key: STREAM_ID, value }],
    });
  };

  const baseTime = Date.now();

  for (let index = 0; index < CHAT_LINES.length; index += 1) {
    const line = CHAT_LINES[index]!;
    const occurredAt = new Date(baseTime + index * 1500).toISOString();
    const chat: ChatMessageEvent = {
      eventId: randomUUID(),
      type: "chat.message",
      platform: PLATFORM,
      streamId: STREAM_ID,
      occurredAt,
      messageId: `demo-msg-${String(index)}`,
      userId: `user-${line.username}`,
      username: line.username,
      text: line.text,
      kind: line.kind,
      ...(line.amountMicros !== undefined
        ? { amountMicros: line.amountMicros, currency: line.currency }
        : {}),
    };
    ChatMessageEventSchema.parse(chat);
    await publishJson(send, KafkaTopics.CHAT_MESSAGES, chat);

    const score =
      line.text.includes("fire") || line.text.includes("gooo")
        ? 0.75
        : line.text.includes("meh")
          ? -0.4
          : 0.15;
    const label = score > 0.3 ? "positive" : score < -0.2 ? "negative" : "neutral";
    const sentiment: SentimentResultEvent = {
      eventId: randomUUID(),
      type: "sentiment.result",
      platform: PLATFORM,
      streamId: STREAM_ID,
      occurredAt,
      sourceEventId: chat.eventId,
      sourceType: "chat.message",
      label,
      score,
      confidence: 0.85,
    };
    SentimentResultEventSchema.parse(sentiment);
    await publishJson(send, KafkaTopics.SENTIMENT_RESULTS, sentiment);
  }

  const brands = ["Acme", "PulsePay", "NovaEnergy"] as const;
  for (let index = 0; index < brands.length; index += 1) {
    const brand = brands[index]!;
    const mention: BrandMentionEvent = {
      eventId: randomUUID(),
      type: "brand.mention",
      platform: PLATFORM,
      streamId: STREAM_ID,
      occurredAt: new Date(baseTime + 2000 + index * 2000).toISOString(),
      sourceEventId: randomUUID(),
      sourceType: index === 0 ? "chat.message" : "transcript.segment",
      brand,
      mentionText: `talking about ${brand}`,
      confidence: 0.8 + index * 0.05,
    };
    BrandMentionEventSchema.parse(mention);
    await publishJson(send, KafkaTopics.BRAND_MENTIONS, mention);
  }

  const rollup: AnalyticsRollupEvent = {
    eventId: randomUUID(),
    type: "analytics.rollup",
    platform: PLATFORM,
    streamId: STREAM_ID,
    occurredAt: new Date(baseTime + 12_000).toISOString(),
    windowType: "1m",
    windowStart: new Date(baseTime).toISOString(),
    windowEnd: new Date(baseTime + 60_000).toISOString(),
    chatVolume: CHAT_LINES.length,
    paidChatVolume: 1,
    sentimentSampleCount: CHAT_LINES.length,
    averageSentimentScore: 0.28,
    positiveCount: 2,
    neutralCount: 2,
    negativeCount: 1,
    brandMentionCount: brands.length,
    uniqueBrands: [...brands],
    averageSponsorRelevance: 0.72,
    engagementScore: CHAT_LINES.length + 2 + brands.length,
  };
  AnalyticsRollupEventSchema.parse(rollup);
  await publishJson(send, KafkaTopics.ANALYTICS_ROLLUPS, rollup);

  const rec: RecommendationEvent = {
    eventId: randomUUID(),
    type: "recommendation.generated",
    platform: PLATFORM,
    streamId: STREAM_ID,
    occurredAt: new Date(baseTime + 13_000).toISOString(),
    code: "sponsor_callout",
    severity: "action",
    title: "Acknowledge Acme mention",
    summary: "Chat and transcript both hit Acme — thank the sponsor while energy is high.",
    relatedBrands: ["Acme"],
    windowType: "1m",
  };
  RecommendationEventSchema.parse(rec);
  await publishJson(send, KafkaTopics.RECOMMENDATIONS, rec);

  await producer.disconnect();
  console.log("Demo seed complete. Open http://localhost:3001 (web) or Grafana :3008.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
