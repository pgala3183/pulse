import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import type { Counter, Histogram } from "prom-client";

/** Domain counters shared across Pulse Nest services for Grafana panels. */
@Injectable()
export class PulseMetrics {
  constructor(
    @InjectMetric("pulse_chat_messages_total")
    private readonly chatMessages: Counter<string>,
    @InjectMetric("pulse_sentiment_results_total")
    private readonly sentimentResults: Counter<string>,
    @InjectMetric("pulse_brand_mentions_total")
    private readonly brandMentions: Counter<string>,
    @InjectMetric("pulse_recommendations_total")
    private readonly recommendations: Counter<string>,
    @InjectMetric("pulse_kafka_handler_duration_seconds")
    private readonly kafkaHandlerDuration: Histogram<string>,
  ) {}

  recordChatMessage(platform: string): void {
    this.chatMessages.inc({ platform });
  }

  recordSentiment(platform: string, label: string): void {
    this.sentimentResults.inc({ platform, label });
  }

  recordBrandMention(platform: string, brand: string): void {
    this.brandMentions.inc({ platform, brand });
  }

  recordRecommendation(platform: string, severity: string): void {
    this.recommendations.inc({ platform, severity });
  }

  observeKafkaHandler(topic: string, seconds: number): void {
    this.kafkaHandlerDuration.observe({ topic }, seconds);
  }
}
