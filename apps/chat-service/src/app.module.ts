import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { ObservabilityModule } from "@pulse/observability";
import { Kafka } from "kafkajs";
import { ChatAdapterFactory } from "./chat-adapter.factory";
import { CHAT_KAFKA_CLIENT, ChatIngestionService } from "./chat-ingestion.service";
import { ChatController } from "./chat.controller";
import { APP_CONFIG, loadChatServiceConfig, type ChatServiceConfig } from "./config";
import { IngestionCommandConsumer } from "./ingestion-command.consumer";

@Module({
  imports: [ObservabilityModule.forRoot({ serviceName: "chat-service" })],
  controllers: [ChatController],
  providers: [
    ChatAdapterFactory,
    ChatIngestionService,
    IngestionCommandConsumer,
    {
      provide: APP_CONFIG,
      useFactory: async () => loadChatServiceConfig(),
    },
    {
      provide: CHAT_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: ChatServiceConfig) =>
        new PulseKafkaClient(
          new Kafka({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
          }),
        ),
    },
  ],
  exports: [ChatIngestionService, ChatAdapterFactory, CHAT_KAFKA_CLIENT, APP_CONFIG],
})
export class AppModule {}
