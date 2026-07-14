import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadChatServiceConfig } from "./config";

async function bootstrap(): Promise<void> {
  const config = await loadChatServiceConfig();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
