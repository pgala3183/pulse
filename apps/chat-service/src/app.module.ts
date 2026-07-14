import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { Kafka } from "kafkajs";
import { ChatAdapterFactory } from "./chat-adapter.factory";
import { CHAT_KAFKA_CLIENT, ChatIngestionService } from "./chat-ingestion.service";
import { ChatController } from "./chat.controller";
import { IngestionCommandConsumer } from "./ingestion-command.consumer";

export function createChatKafkaClientFromEnv(): PulseKafkaClient {
  const brokers = (process.env["KAFKA_BROKERS"] ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  return new PulseKafkaClient(
    new Kafka({
      clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-chat-service",
      brokers: brokers.length > 0 ? brokers : ["localhost:9092"],
    }),
  );
}

@Module({
  controllers: [ChatController],
  providers: [
    ChatAdapterFactory,
    ChatIngestionService,
    IngestionCommandConsumer,
    {
      provide: CHAT_KAFKA_CLIENT,
      useFactory: () => createChatKafkaClientFromEnv(),
    },
  ],
  exports: [ChatIngestionService, ChatAdapterFactory, CHAT_KAFKA_CLIENT],
})
export class AppModule {}
