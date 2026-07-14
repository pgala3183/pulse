import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConfigError, loadConfig, loadConfigSync } from "./load-config";
import { resolveServiceBaseUrl } from "./schemas";

const SampleSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  API_KEY: z.string().min(1),
});

describe("loadConfig", () => {
  it("validates and returns typed config from env", async () => {
    const config = await loadConfig(SampleSchema, {
      env: { PORT: "3000", API_KEY: "secret" },
    });
    expect(config).toEqual({ PORT: 3000, API_KEY: "secret" });
  });

  it("fails fast on missing required values", async () => {
    await expect(
      loadConfig(SampleSchema, { env: { PORT: "3000" } }),
    ).rejects.toBeInstanceOf(ConfigError);
  });

  it("resolves secret: refs via injected resolver", async () => {
    const resolveSecret = vi.fn(async () => "from-gsm");
    const config = await loadConfig(SampleSchema, {
      env: { PORT: "3001", API_KEY: "secret:projects/p/secrets/api-key/versions/latest" },
      resolveSecret,
    });
    expect(config.API_KEY).toBe("from-gsm");
    expect(resolveSecret).toHaveBeenCalledOnce();
  });
});

describe("loadConfigSync", () => {
  it("rejects secret refs (must use async loader)", () => {
    expect(() =>
      loadConfigSync(SampleSchema, {
        PORT: "3000",
        API_KEY: "gsm:api-key",
      }),
    ).toThrow(ConfigError);
  });
});

describe("resolveServiceBaseUrl", () => {
  it("uses localhost, Compose DNS, and Kubernetes DNS by deployment env", () => {
    expect(resolveServiceBaseUrl("ml-service", 8000, "local")).toBe("http://127.0.0.1:8000");
    expect(resolveServiceBaseUrl("ml-service", 8000, "compose")).toBe(
      "http://ml-service:8000",
    );
    expect(resolveServiceBaseUrl("ml-service", 8000, "kubernetes", "pulse")).toBe(
      "http://ml-service.pulse.svc.cluster.local:8000",
    );
  });
});
