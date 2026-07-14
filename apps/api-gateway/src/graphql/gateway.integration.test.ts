import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PubSub } from "graphql-subscriptions";
import request from "supertest";
import type { BrandMentionEvent, SentimentResultEvent } from "@pulse/event-schemas";
import { AppModule } from "../app.module";
import { LiveEventsBridge, PULSE_KAFKA_CLIENT } from "../kafka/live-events.bridge";
import { GRAPHQL_PUB_SUB } from "../pubsub.tokens";
import { Platform } from "../graphql/enums";

const API_KEY = "test-api-key";

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function graphql<T>(
  app: INestApplication,
  query: string,
  variables?: Record<string, unknown>,
  apiKey = API_KEY,
): Promise<GraphQlResponse<T>> {
  const response = await request(app.getHttpServer())
    .post("/graphql")
    .set("x-api-key", apiKey)
    .send({ query, variables });

  expect(response.status).toBeLessThan(500);
  return response.body as GraphQlResponse<T>;
}

describe("API gateway integration", () => {
  let app: INestApplication;
  let bridge: LiveEventsBridge;
  let pubSub: PubSub;
  const publishTyped = vi.fn(async (_topic: string, _schema: unknown, payload: unknown) => payload);
  const consumeTyped = vi.fn(async () => ({ stop: vi.fn(async () => undefined) }));
  const disconnect = vi.fn(async () => undefined);

  beforeAll(async () => {
    process.env["PULSE_API_KEY"] = API_KEY;
    process.env["KAFKA_BRIDGE_DISABLED"] = "true";
    process.env["KAFKA_PUBLISH_DISABLED"] = "false";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PULSE_KAFKA_CLIENT)
      .useValue({
        publishTyped,
        consumeTyped,
        disconnect,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    bridge = app.get(LiveEventsBridge);
    pubSub = app.get(GRAPHQL_PUB_SUB);
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects GraphQL requests without an API key", async () => {
    const body = await graphql<{ streamIngestions: unknown[] }>(
      app,
      `query { streamIngestions { streamId } }`,
      undefined,
      "",
    );
    expect(body.errors?.some((error) => /api key/i.test(error.message))).toBe(true);
  });

  it("starts and stops stream ingestion via mutations", async () => {
    const start = await graphql<{
      startStreamIngestion: {
        streamId: string;
        platform: string;
        status: string;
        targetId: string;
      };
    }>(
      app,
      `
      mutation Start($input: StartStreamIngestionInput!) {
        startStreamIngestion(input: $input) {
          streamId
          platform
          status
          targetId
        }
      }
    `,
      {
        input: {
          platform: "TWITCH",
          streamId: "stream-1",
          targetId: "cool_streamer",
        },
      },
    );

    expect(start.errors).toBeUndefined();
    expect(start.data?.startStreamIngestion).toMatchObject({
      streamId: "stream-1",
      platform: "TWITCH",
      status: "RUNNING",
      targetId: "cool_streamer",
    });
    expect(publishTyped).toHaveBeenCalled();

    const stop = await graphql<{
      stopStreamIngestion: { status: string };
    }>(
      app,
      `
      mutation Stop($input: StopStreamIngestionInput!) {
        stopStreamIngestion(input: $input) {
          status
        }
      }
    `,
      {
        input: {
          platform: "TWITCH",
          streamId: "stream-1",
        },
      },
    );

    expect(stop.errors).toBeUndefined();
    expect(stop.data?.stopStreamIngestion.status).toBe("STOPPED");
  });

  it("queries live sentiment, brand mentions, and analytics summaries", async () => {
    const sentimentEvent: SentimentResultEvent = {
      eventId: "550e8400-e29b-41d4-a716-446655440010",
      type: "sentiment.result",
      platform: "twitch",
      streamId: "stream-analytics",
      occurredAt: "2026-07-13T21:00:00.000Z",
      sourceEventId: "550e8400-e29b-41d4-a716-446655440011",
      sourceType: "chat.message",
      label: "positive",
      score: 0.7,
      confidence: 0.9,
    };
    const brandEvent: BrandMentionEvent = {
      eventId: "550e8400-e29b-41d4-a716-446655440012",
      type: "brand.mention",
      platform: "twitch",
      streamId: "stream-analytics",
      occurredAt: "2026-07-13T21:00:01.000Z",
      sourceEventId: "550e8400-e29b-41d4-a716-446655440013",
      sourceType: "transcript.segment",
      brand: "Acme",
      mentionText: "thanks Acme",
      confidence: 0.85,
    };

    await bridge.ingestSentimentEvent(sentimentEvent);
    await bridge.ingestBrandMentionEvent(brandEvent);

    const sentiment = await graphql<{ liveSentiment: Array<{ label: string; score: number }> }>(
      app,
      `
      query {
        liveSentiment(streamId: "stream-analytics", limit: 10) {
          label
          score
        }
      }
    `,
    );
    expect(sentiment.errors).toBeUndefined();
    expect(sentiment.data?.liveSentiment[0]).toMatchObject({
      label: "POSITIVE",
      score: 0.7,
    });

    const brands = await graphql<{ liveBrandMentions: Array<{ brand: string }> }>(
      app,
      `
      query {
        liveBrandMentions(streamId: "stream-analytics") {
          brand
        }
      }
    `,
    );
    expect(brands.errors).toBeUndefined();
    expect(brands.data?.liveBrandMentions[0]?.brand).toBe("Acme");

    const analytics = await graphql<{
      analyticsSummary: {
        sentimentSampleCount: number;
        brandMentionCount: number;
        topBrands: string[];
      };
    }>(
      app,
      `
      query {
        analyticsSummary(streamId: "stream-analytics", platform: TWITCH) {
          sentimentSampleCount
          brandMentionCount
          topBrands
        }
      }
    `,
    );
    expect(analytics.errors).toBeUndefined();
    expect(analytics.data?.analyticsSummary).toMatchObject({
      sentimentSampleCount: 1,
      brandMentionCount: 1,
      topBrands: ["Acme"],
    });
  });

  it("forwards Kafka sentiment events to GraphQL subscriptions", async () => {
    const streamId = "stream-live";
    const iterator = pubSub.asyncIterableIterator<{ sentimentUpdates: { score: number } }>(
      `sentiment.${streamId}`,
    );

    const waitForNext = (async () => {
      const result = await iterator.next();
      return result.value;
    })();

    await bridge.ingestSentimentEvent({
      eventId: "550e8400-e29b-41d4-a716-446655440020",
      type: "sentiment.result",
      platform: "youtube",
      streamId,
      occurredAt: "2026-07-13T21:05:00.000Z",
      sourceEventId: "550e8400-e29b-41d4-a716-446655440021",
      sourceType: "transcript.segment",
      label: "neutral",
      score: 0.1,
      confidence: 0.6,
    });

    const payload = await waitForNext;
    expect(payload.sentimentUpdates.score).toBe(0.1);

    if (typeof iterator.return === "function") {
      await iterator.return();
    }
  });

  it("proxies ML health over REST", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await request(app.getHttpServer()).get("/ml/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      upstream: { status: "ok" },
    });

    fetchMock.mockRestore();
  });

  it("exposes Platform enum for GraphQL clients", () => {
    expect(Platform.TWITCH).toBe("twitch");
    expect(Platform.YOUTUBE).toBe("youtube");
  });
});
