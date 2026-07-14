import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { KafkaTopics, VideoFrameEventSchema } from "@pulse/event-schemas";
import { PulseKafkaClient } from "@pulse/kafka-client";
import { APP_CONFIG, type VideoServiceConfig } from "../config";
import { VIDEO_KAFKA_CLIENT, VideoFrameProcessor } from "../processing/video-frame.processor";

@Injectable()
export class VideoFrameConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoFrameConsumer.name);
  private stop: (() => Promise<void>) | null = null;

  constructor(
    @Inject(VIDEO_KAFKA_CLIENT) private readonly kafka: PulseKafkaClient,
    @Inject(APP_CONFIG) private readonly config: VideoServiceConfig,
    private readonly processor: VideoFrameProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.kafkaConsumerDisabled) {
      this.logger.warn("Video frame Kafka consumer disabled");
      return;
    }

    const handle = await this.kafka.consumeTyped(
      KafkaTopics.VIDEO_FRAMES,
      VideoFrameEventSchema,
      async (frame) => {
        await this.processor.processFrame(frame);
      },
      { groupId: this.config.kafkaGroupId },
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
