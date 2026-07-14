import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { Kafka } from "kafkajs";
import { InMemoryAnalyticsRepository } from "./db/repository";
import { AnalyticsConsumers } from "./kafka/analytics.consumers";
import {
  ANALYTICS_KAFKA_CLIENT,
  ANALYTICS_REPO,
  AnalyticsProcessor,
} from "./processing/analytics.processor";

@Module({
  providers: [
    AnalyticsProcessor,
    AnalyticsConsumers,
    {
      provide: ANALYTICS_KAFKA_CLIENT,
      useFactory: () =>
        new PulseKafkaClient(
          new Kafka({
            clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-analytics-service",
            brokers: (process.env["KAFKA_BROKERS"] ?? "localhost:9092").split(","),
          }),
        ),
    },
    {
      provide: ANALYTICS_REPO,
      useClass: InMemoryAnalyticsRepository,
    },
  ],
  exports: [AnalyticsProcessor],
})
export class AppModule {}
