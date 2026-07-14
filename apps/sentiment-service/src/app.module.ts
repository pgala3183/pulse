import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { MlClient } from "@pulse/ml-client";
import { Kafka } from "kafkajs";
import {
  APP_CONFIG,
  loadSentimentServiceConfig,
  type SentimentServiceConfig,
} from "./config";
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
      provide: APP_CONFIG,
      useFactory: async () => loadSentimentServiceConfig(),
    },
    {
      provide: SENTIMENT_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: SentimentServiceConfig) =>
        new PulseKafkaClient(
          new Kafka({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
          }),
        ),
    },
    {
      provide: SENTIMENT_ML_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: SentimentServiceConfig) =>
        new MlClient({
          baseUrl: config.mlServiceUrl,
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
  exports: [SentimentProcessor, APP_CONFIG],
})
export class AppModule {}
