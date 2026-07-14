import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { Kafka } from "kafkajs";
import {
  APP_CONFIG,
  loadAnalyticsServiceConfig,
  type AnalyticsServiceConfig,
} from "./config";
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
      provide: APP_CONFIG,
      useFactory: async () => loadAnalyticsServiceConfig(),
    },
    {
      provide: ANALYTICS_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AnalyticsServiceConfig) =>
        new PulseKafkaClient(
          new Kafka({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
          }),
        ),
    },
    {
      provide: ANALYTICS_REPO,
      useClass: InMemoryAnalyticsRepository,
    },
  ],
  exports: [AnalyticsProcessor, APP_CONFIG],
})
export class AppModule {}
