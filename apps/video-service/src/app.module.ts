import { Module } from "@nestjs/common";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { MlClient } from "@pulse/ml-client";
import { Kafka } from "kafkajs";
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
      provide: VIDEO_KAFKA_CLIENT,
      useFactory: () =>
        new PulseKafkaClient(
          new Kafka({
            clientId: process.env["KAFKA_CLIENT_ID"] ?? "pulse-video-service",
            brokers: (process.env["KAFKA_BROKERS"] ?? "localhost:9092").split(","),
          }),
        ),
    },
    {
      provide: VIDEO_ML_CLIENT,
      useFactory: () =>
        new MlClient({
          baseUrl: process.env["ML_SERVICE_URL"] ?? "http://localhost:8000",
        }),
    },
    {
      provide: SPONSOR_DETECTION_REPO,
      useClass: InMemorySponsorDetectionRepository,
    },
  ],
  exports: [VideoFrameProcessor],
})
export class AppModule {}
