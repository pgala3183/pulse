import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadApiGatewayConfig } from "./config";

async function bootstrap(): Promise<void> {
  // Fail fast before wiring Nest if config is invalid.
  const config = await loadApiGatewayConfig();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
