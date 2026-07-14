import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { KafkaTopics, VideoFrameEventSchema } from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { VIDEO_KAFKA_CLIENT, VideoFrameProcessor } from "../processing/video-frame.processor";

@Injectable()
export class VideoFrameConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoFrameConsumer.name);
  private stop: (() => Promise<void>) | null = null;

  constructor(
    @Inject(VIDEO_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    private readonly processor: VideoFrameProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env["VIDEO_KAFKA_CONSUMER_DISABLED"] === "true") {
      this.logger.warn("Video frame Kafka consumer disabled");
      return;
    }

    const handle = await this.kafka.consumeTyped(
      KafkaTopics.VIDEO_FRAMES,
      VideoFrameEventSchema,
      async (frame) => {
        await this.processor.processFrame(frame);
      },
      { groupId: process.env["KAFKA_GROUP_ID"] ?? "pulse-video-service" },
    );
    this.stop = handle.stop;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.stop) {
      await this.stop();
      this.stop = null;
    }
  }
}
