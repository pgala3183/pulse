import type { Consumer, EachMessagePayload, Kafka, Producer } from "kafkajs";
import type { z } from "zod";

export class SchemaValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "SchemaValidationError";
    this.issues = issues;
  }
}

export type PulseKafkaLogger = {
  error: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
};

export type ConsumeContext = {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
};

export type TypedMessageHandler<T> = (
  event: T,
  context: ConsumeContext,
) => void | Promise<void>;

export type ConsumeTypedOptions = {
  groupId: string;
  fromBeginning?: boolean;
};

const defaultLogger: PulseKafkaLogger = {
  error: (message, context) => {
    console.error(message, context ?? {});
  },
  warn: (message, context) => {
    console.warn(message, context ?? {});
  },
};

/**
 * Thin typed wrapper over kafkajs. Validates payloads with Zod at publish and
 * consume boundaries so malformed messages are rejected/logged instead of
 * crashing consumers.
 */
export class PulseKafkaClient {
  private producer: Producer | null = null;
  private readonly consumers = new Set<Consumer>();

  constructor(
    private readonly kafka: Kafka,
    private readonly logger: PulseKafkaLogger = defaultLogger,
  ) {}

  async publishTyped<T>(
    topic: string,
    schema: z.ZodType<T>,
    payload: unknown,
    options?: { key?: string },
  ): Promise<T> {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new SchemaValidationError(
        `Refusing to publish invalid payload to topic "${topic}"`,
        parsed.error.issues,
      );
    }

    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key: options?.key,
          value: JSON.stringify(parsed.data),
        },
      ],
    });

    return parsed.data;
  }

  async consumeTyped<T>(
    topic: string,
    schema: z.ZodType<T>,
    handler: TypedMessageHandler<T>,
    options: ConsumeTypedOptions,
  ): Promise<{ stop: () => Promise<void> }> {
    const consumer = this.kafka.consumer({ groupId: options.groupId });
    this.consumers.add(consumer);

    await consumer.connect();
    await consumer.subscribe({
      topic,
      fromBeginning: options.fromBeginning ?? false,
    });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleIncomingMessage(topic, schema, handler, payload);
      },
    });

    return {
      stop: async () => {
        await consumer.disconnect();
        this.consumers.delete(consumer);
      },
    };
  }

  async disconnect(): Promise<void> {
    const disconnects: Promise<void>[] = [];

    if (this.producer) {
      disconnects.push(this.producer.disconnect());
      this.producer = null;
    }

    for (const consumer of this.consumers) {
      disconnects.push(consumer.disconnect());
    }
    this.consumers.clear();

    await Promise.all(disconnects);
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  private async handleIncomingMessage<T>(
    topic: string,
    schema: z.ZodType<T>,
    handler: TypedMessageHandler<T>,
    payload: EachMessagePayload,
  ): Promise<void> {
    const rawValue = payload.message.value?.toString("utf8");
    if (rawValue === undefined || rawValue.length === 0) {
      this.logger.warn("Skipping empty Kafka message", {
        topic,
        partition: payload.partition,
        offset: payload.message.offset,
      });
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(rawValue) as unknown;
    } catch (error) {
      this.logger.error("Skipping malformed Kafka message JSON", {
        topic,
        partition: payload.partition,
        offset: payload.message.offset,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      this.logger.error("Skipping Kafka message that failed schema validation", {
        topic,
        partition: payload.partition,
        offset: payload.message.offset,
        issues: parsed.error.issues,
      });
      return;
    }

    const keyBuffer = payload.message.key;
    await handler(parsed.data, {
      topic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      key: keyBuffer ? keyBuffer.toString("utf8") : null,
    });
  }
}
