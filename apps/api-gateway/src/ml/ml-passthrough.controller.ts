import { Public } from "../auth/public.decorator";
import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

@Controller("ml")
export class MlPassthroughController {
  @Public()
  @SkipThrottle()
  @Get("health")
  async health(): Promise<{ status: string; upstream: unknown }> {
    const baseUrl = (process.env["ML_SERVICE_URL"] ?? "http://localhost:8000").replace(
      /\/$/,
      "",
    );

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
