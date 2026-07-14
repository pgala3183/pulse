import { DynamicModule, Module } from "@nestjs/common";
import {
  makeCounterProvider,
  makeHistogramProvider,
  PrometheusModule,
} from "@willsoto/nestjs-prometheus";
import { HealthController } from "./health.controller";
import { PulseMetrics } from "./pulse-metrics";

export type ObservabilityModuleOptions = {
  /** Prometheus `app` label + service identity for dashboards. */
  serviceName: string;
};

const chatCounter = makeCounterProvider({
  name: "pulse_chat_messages_total",
  help: "Chat messages observed by this service",
  labelNames: ["platform"] as const,
});

const sentimentCounter = makeCounterProvider({
  name: "pulse_sentiment_results_total",
  help: "Sentiment results observed by this service",
  labelNames: ["platform", "label"] as const,
});

const brandCounter = makeCounterProvider({
  name: "pulse_brand_mentions_total",
  help: "Brand/sponsor mentions observed by this service",
  labelNames: ["platform", "brand"] as const,
});

const recommendationCounter = makeCounterProvider({
  name: "pulse_recommendations_total",
  help: "Recommendations emitted or forwarded by this service",
  labelNames: ["platform", "severity"] as const,
});

const kafkaHistogram = makeHistogramProvider({
  name: "pulse_kafka_handler_duration_seconds",
  help: "Kafka handler latency in seconds",
  labelNames: ["topic"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

@Module({})
export class ObservabilityModule {
  static forRoot(options: ObservabilityModuleOptions): DynamicModule {
    return {
      module: ObservabilityModule,
      imports: [
        PrometheusModule.register({
          path: "/metrics",
          defaultMetrics: {
            enabled: true,
          },
          defaultLabels: {
            app: options.serviceName,
          },
        }),
      ],
      controllers: [HealthController],
      providers: [
        chatCounter,
        sentimentCounter,
        brandCounter,
        recommendationCounter,
        kafkaHistogram,
        PulseMetrics,
      ],
      exports: [PrometheusModule, PulseMetrics],
    };
  }
}
