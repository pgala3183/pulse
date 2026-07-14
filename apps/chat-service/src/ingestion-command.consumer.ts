import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { IngestionCommandEventSchema, KafkaTopics } from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { APP_CONFIG, type ChatServiceConfig } from "./config";
import { CHAT_KAFKA_CLIENT, ChatIngestionService } from "./chat-ingestion.service";

@Injectable()
export class IngestionCommandConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionCommandConsumer.name);
  private stopConsumer: (() => Promise<void>) | null = null;

  constructor(
    @Inject(CHAT_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(APP_CONFIG) private readonly config: ChatServiceConfig,
    private readonly ingestion: ChatIngestionService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.kafkaConsumerDisabled) {
      this.logger.warn("Ingestion command consumer disabled");
      return;
    }

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
      { groupId: this.config.kafkaGroupId },
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
