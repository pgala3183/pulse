import type {
  Consumer,
  EachMessageHandler,
  EachMessagePayload,
  Kafka,
  Producer,
  ProducerRecord,
} from "kafkajs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PulseKafkaClient, SchemaValidationError } from "./client.js";

const SampleSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(["twitch", "youtube"]),
});

type SampleEvent = z.infer<typeof SampleSchema>;

function createMockKafka() {
  const sent: ProducerRecord[] = [];
  let eachMessage: EachMessageHandler | undefined;

  const producer = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    send: vi.fn(async (record: ProducerRecord) => {
      sent.push(record);
      return [];
    }),
  } as unknown as Producer;

  const consumer = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    subscribe: vi.fn(async () => undefined),
    run: vi.fn(async ({ eachMessage: handler }: { eachMessage: EachMessageHandler }) => {
      eachMessage = handler;
    }),
  } as unknown as Consumer;

  const kafka = {
    producer: vi.fn(() => producer),
    consumer: vi.fn(() => consumer),
  } as unknown as Kafka;

  return {
    kafka,
    producer,
    consumer,
    sent,
    emit: async (payload: EachMessagePayload) => {
      if (!eachMessage) {
        throw new Error("consumeTyped has not registered an eachMessage handler yet");
      }
      await eachMessage(payload);
    },
  };
}

function messagePayload(value: unknown, overrides?: Partial<EachMessagePayload>): EachMessagePayload {
  return {
    topic: "pulse.events",
    partition: 0,
    message: {
      key: Buffer.from("key-1"),
      value: Buffer.from(JSON.stringify(value)),
      timestamp: "0",
      attributes: 0,
      offset: "42",
      headers: {},
    },
    heartbeat: vi.fn(async () => undefined),
    pause: vi.fn(),
    ...overrides,
  };
}

describe("PulseKafkaClient", () => {
  let mocks: ReturnType<typeof createMockKafka>;
  let logger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let client: PulseKafkaClient;

  beforeEach(() => {
    mocks = createMockKafka();
    logger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    client = new PulseKafkaClient(mocks.kafka, logger);
  });

  describe("publishTyped", () => {
    it("validates and publishes a valid payload", async () => {
      const payload: SampleEvent = { id: "evt-1", platform: "twitch" };

      const result = await client.publishTyped("pulse.events", SampleSchema, payload, {
        key: "stream-1",
      });

      expect(result).toEqual(payload);
      expect(mocks.producer.connect).toHaveBeenCalledOnce();
      expect(mocks.producer.send).toHaveBeenCalledWith({
        topic: "pulse.events",
        messages: [
          {
            key: "stream-1",
            value: JSON.stringify(payload),
          },
        ],
      });
    });

    it("rejects malformed payloads before sending", async () => {
      await expect(
        client.publishTyped("pulse.events", SampleSchema, { id: "evt-1", platform: "tiktok" }),
      ).rejects.toBeInstanceOf(SchemaValidationError);

      expect(mocks.producer.send).not.toHaveBeenCalled();
    });
  });

  describe("consumeTyped", () => {
    it("invokes the handler for valid messages", async () => {
      const handler = vi.fn(async (_event: SampleEvent) => undefined);
      const valid: SampleEvent = { id: "evt-2", platform: "youtube" };

      await client.consumeTyped("pulse.events", SampleSchema, handler, {
        groupId: "test-group",
      });
      await mocks.emit(messagePayload(valid));

      expect(handler).toHaveBeenCalledWith(valid, {
        topic: "pulse.events",
        partition: 0,
        offset: "42",
        key: "key-1",
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("logs and skips schema-invalid messages without crashing", async () => {
      const handler = vi.fn(async (_event: SampleEvent) => undefined);

      await client.consumeTyped("pulse.events", SampleSchema, handler, {
        groupId: "test-group",
      });
      await mocks.emit(messagePayload({ id: "evt-3", platform: "tiktok" }));

      expect(handler).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        "Skipping Kafka message that failed schema validation",
        expect.objectContaining({
          topic: "pulse.events",
          offset: "42",
        }),
      );
    });

    it("logs and skips invalid JSON without crashing", async () => {
      const handler = vi.fn(async (_event: SampleEvent) => undefined);

      await client.consumeTyped("pulse.events", SampleSchema, handler, {
        groupId: "test-group",
      });
      await mocks.emit(
        messagePayload(null, {
          message: {
            key: null,
            value: Buffer.from("{not-json"),
            timestamp: "0",
            attributes: 0,
            offset: "7",
            headers: {},
          },
        }),
      );

      expect(handler).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        "Skipping malformed Kafka message JSON",
        expect.objectContaining({
          topic: "pulse.events",
          offset: "7",
        }),
      );
    });
  });
});
