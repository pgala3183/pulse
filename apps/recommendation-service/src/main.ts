import "reflect-metadata";
import { startTelemetry } from "@pulse/observability";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadRecommendationServiceConfig } from "./config";

async function bootstrap(): Promise<void> {
  startTelemetry({ serviceName: "recommendation-service" });
  const config = await loadRecommendationServiceConfig();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
