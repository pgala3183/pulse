import { describe, expect, it } from "vitest";
import { startTelemetry } from "./telemetry";

describe("startTelemetry", () => {
  it("is a no-op when OTEL_SDK_DISABLED=true", () => {
    process.env["OTEL_SDK_DISABLED"] = "true";
    expect(() => {
      startTelemetry({ serviceName: "pulse-test" });
    }).not.toThrow();
    delete process.env["OTEL_SDK_DISABLED"];
  });
});
