import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../auth/public.decorator";
import { APP_CONFIG, type ApiGatewayConfig } from "../config";

@Controller("ml")
export class MlPassthroughController {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiGatewayConfig) {}

  @Public()
  @SkipThrottle()
  @Get("health")
  async health(): Promise<{ status: string; upstream: unknown }> {
    const baseUrl = this.config.mlServiceUrl.replace(/\/$/, "");

    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `ML service health check failed with status ${String(response.status)}`,
        );
      }
      const upstream: unknown = await response.json();
      return { status: "ok", upstream };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `ML service unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
