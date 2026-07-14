import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { MlClient } from "@pulse/ml-client";
import { Kafka } from "kafkajs";
import { InMemorySentimentRepository } from "./db/repository";
import { SentimentConsumers } from "./kafka/sentiment.consumers";
import {
  SENTIMENT_CACHE,
  SENTIMENT_KAFKA_CLIENT,
  SENTIMENT_ML_CLIENT,
  SENTIMENT_REPO,
  SentimentProcessor,
} from "./processing/sentiment.processor";
import { InMemorySentimentCache } from "./redis/cache";

@Module({
  providers: [
    SentimentProcessor,
    SentimentConsumers,
    {
      provide: SENTIMENT_KAFKA_CLIENT,
      useFactory: () =>
        new PulseKafkaClient(
          new Kafka({
            clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-sentiment-service",
            brokers: (process.env["KAFKA_BROKERS"] ?? "localhost:9092").split(","),
          }),
        ),
    },
    {
      provide: SENTIMENT_ML_CLIENT,
      useFactory: () =>
        new MlClient({
          baseUrl: process.env["ML_SERVICE_URL"] ?? "http://localhost:8000",
        }),
    },
    {
      provide: SENTIMENT_REPO,
      useClass: InMemorySentimentRepository,
    },
    {
      provide: SENTIMENT_CACHE,
      useClass: InMemorySentimentCache,
    },
  ],
  exports: [SentimentProcessor],
})
export class AppModule {}
