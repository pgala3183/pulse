import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { ObservabilityModule } from "@pulse/observability";
import { Kafka } from "kafkajs";
import {
  APP_CONFIG,
  loadRecommendationServiceConfig,
  type RecommendationServiceConfig,
} from "./config";
import { RecommendationConsumer } from "./kafka/recommendation.consumer";
import {
  RECOMMENDATION_KAFKA_CLIENT,
  RecommendationProcessor,
} from "./processing/recommendation.processor";

@Module({
  imports: [ObservabilityModule.forRoot({ serviceName: "recommendation-service" })],
  providers: [
    RecommendationProcessor,
    RecommendationConsumer,
    {
      provide: APP_CONFIG,
      useFactory: async () => loadRecommendationServiceConfig(),
    },
    {
      provide: RECOMMENDATION_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: RecommendationServiceConfig) =>
        new PulseKafkaClient(
          new Kafka({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
          }),
        ),
    },
  ],
  exports: [RecommendationProcessor, APP_CONFIG],
})
export class AppModule {}
