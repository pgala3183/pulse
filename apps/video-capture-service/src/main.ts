import "reflect-metadata";
import { startTelemetry } from "@pulse/observability";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  startTelemetry({ serviceName: "video-capture-service" });
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(process.env["PORT"] ?? 3007);
}

void bootstrap();
