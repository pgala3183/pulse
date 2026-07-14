import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  ChatMessageEventSchema,
  KafkaTopics,
  TranscriptSegmentEventSchema,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { APP_CONFIG, type SentimentServiceConfig } from "../config";
import {
  SENTIMENT_KAFKA_CLIENT,
  SentimentProcessor,
} from "../processing/sentiment.processor";

@Injectable()
export class SentimentConsumers implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SentimentConsumers.name);
  private readonly stoppers: Array<() => Promise<void>> = [];

  constructor(
    @Inject(SENTIMENT_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(APP_CONFIG) private readonly config: SentimentServiceConfig,
    private readonly processor: SentimentProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.kafkaConsumerDisabled) {
      this.logger.warn("Sentiment Kafka consumers disabled");
      return;
    }

    const groupId = this.config.kafkaGroupId;

    const chat = await this.kafka.consumeTyped(
      KafkaTopics.CHAT_MESSAGES,
      ChatMessageEventSchema,
      async (event) => {
        await this.processor.process({ sourceType: "chat.message", event });
      },
      { groupId: `${groupId}-chat` },
    );
    this.stoppers.push(chat.stop);

    const transcripts = await this.kafka.consumeTyped(
      KafkaTopics.TRANSCRIPT_SEGMENTS,
      TranscriptSegmentEventSchema,
      async (event) => {
        await this.processor.process({ sourceType: "transcript.segment", event });
      },
      { groupId: `${groupId}-transcript` },
    );
    this.stoppers.push(transcripts.stop);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.stoppers.map(async (stop) => stop()));
    this.stoppers.length = 0;
  }
}
