import { Module } from "@nestjs/common";
import { ObservabilityModule } from "@pulse/observability";

@Module({
  imports: [ObservabilityModule.forRoot({ serviceName: "video-capture-service" })],
  controllers: [],
  providers: [],
})
export class AppModule {}
