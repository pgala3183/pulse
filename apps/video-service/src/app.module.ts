import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { MlClient } from "@pulse/ml-client";
import { Kafka } from "kafkajs";
import { APP_CONFIG, loadVideoServiceConfig, type VideoServiceConfig } from "./config";
import { InMemorySponsorDetectionRepository } from "./db/repository";
import { VideoFrameConsumer } from "./kafka/video-frame.consumer";
import {
  SPONSOR_DETECTION_REPO,
  VIDEO_KAFKA_CLIENT,
  VIDEO_ML_CLIENT,
  VideoFrameProcessor,
} from "./processing/video-frame.processor";

@Module({
  providers: [
    VideoFrameProcessor,
    VideoFrameConsumer,
    {
      provide: APP_CONFIG,
      useFactory: async () => loadVideoServiceConfig(),
    },
    {
      provide: VIDEO_KAFKA_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: VideoServiceConfig) =>
        new PulseKafkaClient(
          new Kafka({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
          }),
        ),
    },
    {
      provide: VIDEO_ML_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: VideoServiceConfig) =>
        new MlClient({
          baseUrl: config.mlServiceUrl,
        }),
    },
    {
      provide: SPONSOR_DETECTION_REPO,
      useClass: InMemorySponsorDetectionRepository,
    },
  ],
  exports: [VideoFrameProcessor, APP_CONFIG],
})
export class AppModule {}
