import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export type TelemetryOptions = {
  serviceName: string;
  serviceVersion?: string;
  zipkinUrl?: string;
};

let started = false;

/**
 * Boot OpenTelemetry before NestFactory.create().
 * Traces export to Zipkin (see docs/adr/0005-observability-backend.md).
 */
export function startTelemetry(options: TelemetryOptions): void {
  if (started || process.env["OTEL_SDK_DISABLED"] === "true") {
    return;
  }

  const zipkinUrl =
    options.zipkinUrl ??
    process.env["OTEL_EXPORTER_ZIPKIN_ENDPOINT"] ??
    "http://localhost:9411/api/v2/spans";

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName,
      [ATTR_SERVICE_VERSION]: options.serviceVersion ?? "0.0.0",
    }),
    traceExporter: new ZipkinExporter({ url: zipkinUrl }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
  started = true;

  const shutdown = (): void => {
    void sdk.shutdown();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
