import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  IngestionCommandEventSchema,
  KafkaTopics,
} from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { CHAT_KAFKA_CLIENT, ChatIngestionService } from "./chat-ingestion.service";

@Injectable()
export class IngestionCommandConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionCommandConsumer.name);
  private stopConsumer: (() => Promise<void>) | null = null;

  constructor(
    @Inject(CHAT_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    private readonly ingestion: ChatIngestionService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env["CHAT_KAFKA_CONSUMER_DISABLED"] === "true") {
      this.logger.warn("Ingestion command consumer disabled");
      return;
    }

    const groupId = process.env["KAFKA_GROUP_ID"] ?? "pulse-chat-service";
    const handle = await this.kafka.consumeTyped(
      KafkaTopics.INGESTION_COMMANDS,
      IngestionCommandEventSchema,
      async (command) => {
        if (command.action === "start") {
          await this.ingestion.start({
            platform: command.platform,
            streamId: command.streamId,
            targetId: command.targetId,
          });
          return;
        }
        await this.ingestion.stop(command.platform, command.streamId);
      },
      { groupId },
    );
    this.stopConsumer = handle.stop;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.stopConsumer) {
      await this.stopConsumer();
      this.stopConsumer = null;
    }
  }
}
