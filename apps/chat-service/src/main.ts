import "reflect-metadata";
import { startTelemetry } from "@pulse/observability";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadChatServiceConfig } from "./config";

async function bootstrap(): Promise<void> {
  startTelemetry({ serviceName: "chat-service" });
  const config = await loadChatServiceConfig();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
