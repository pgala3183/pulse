import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { Kafka } from "kafkajs";
import { RecommendationConsumer } from "./kafka/recommendation.consumer";
import {
  RECOMMENDATION_KAFKA_CLIENT,
  RecommendationProcessor,
} from "./processing/recommendation.processor";

@Module({
  providers: [
    RecommendationProcessor,
    RecommendationConsumer,
    {
      provide: RECOMMENDATION_KAFKA_CLIENT,
      useFactory: () =>
        new PulseKafkaClient(
          new Kafka({
            clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-recommendation-service",
            brokers: (process.env["KAFKA_BROKERS"] ?? "localhost:9092").split(","),
          }),
        ),
    },
  ],
  exports: [RecommendationProcessor],
})
export class AppModule {}
