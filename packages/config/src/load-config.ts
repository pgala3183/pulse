import { z } from "zod";
import { formatZodError } from "./errors";

/**
 * Fail-fast config loader. Validates with Zod after optionally resolving
 * `secret:` / `gsm:` references via the configured secret backend.
 *
 * Local/dev: values come from process.env (Compose injects env; DNS is separate).
 * Deployed: set CONFIG_BACKEND=gcp-secret-manager and reference secrets as
 * `secret:projects/PROJECT/secrets/NAME/versions/latest` (or `gsm:NAME`).
 */
export type LoadConfigOptions = {
  env?: NodeJS.ProcessEnv;
  /** Override secret resolution (tests / custom backends). */
  resolveSecret?: (ref: string) => Promise<string>;
  /** When true (default), throw ConfigError instead of returning. */
  failFast?: boolean;
};

export class ConfigError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = "ConfigError";
  }
}

const SECRET_PREFIXES = ["secret:", "gsm:"] as const;

export function isSecretRef(value: string): boolean {
  return SECRET_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export async function loadConfig<Schema extends z.ZodTypeAny>(
  schema: Schema,
  options: LoadConfigOptions = {},
): Promise<z.output<Schema>> {
  const env = options.env ?? process.env;
  const failFast = options.failFast ?? true;

  let raw: Record<string, string | undefined>;
  try {
    raw = await materializeEnv(env, options.resolveSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve configuration secrets";
    if (failFast) {
      throw new ConfigError(message, error);
    }
    throw error;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const formatted = formatZodError(parsed.error);
    if (failFast) {
      throw new ConfigError(
        `Invalid configuration — refuse to start:\n${formatted}`,
        parsed.error.flatten(),
      );
    }
    throw parsed.error;
  }

  return parsed.data as z.output<Schema>;
}

/** Synchronous loader when no secret refs are present (local schemas only). */
export function loadConfigSync<Schema extends z.ZodTypeAny>(
  schema: Schema,
  env: NodeJS.ProcessEnv = process.env,
): z.output<Schema> {
  for (const value of Object.values(env)) {
    if (typeof value === "string" && isSecretRef(value)) {
      throw new ConfigError(
        "Secret references require async loadConfig(); found a secret: or gsm: value in env",
      );
    }
  }

  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid configuration — refuse to start:\n${formatZodError(parsed.error)}`,
      parsed.error.flatten(),
    );
  }
  return parsed.data as z.output<Schema>;
}

async function materializeEnv(
  env: NodeJS.ProcessEnv,
  resolveSecret?: (ref: string) => Promise<string>,
): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = { ...env };
  const backend = resolveSecret ?? (await defaultSecretResolver(env));

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string" || !isSecretRef(value)) {
      continue;
    }
    out[key] = await backend(value);
  }

  return out;
}

async function defaultSecretResolver(
  env: NodeJS.ProcessEnv,
): Promise<(ref: string) => Promise<string>> {
  const backend = (env["CONFIG_BACKEND"] ?? "env").toLowerCase();
  if (backend === "env" || backend === "none") {
    return async (ref: string) => {
      throw new ConfigError(
        `Secret reference "${ref}" found but CONFIG_BACKEND is "${backend}". Set CONFIG_BACKEND=gcp-secret-manager or provide the value inline for local/dev.`,
      );
    };
  }

  if (backend === "gcp-secret-manager" || backend === "gsm") {
    const { createGcpSecretResolver } = await import("./secret-manager");
    return createGcpSecretResolver(env);
  }

  throw new ConfigError(`Unknown CONFIG_BACKEND "${backend}"`);
}
