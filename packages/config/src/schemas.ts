import { z } from "zod";

export const DeploymentEnvSchema = z.enum(["local", "compose", "kubernetes"]);
export type DeploymentEnv = z.infer<typeof DeploymentEnvSchema>;

export const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    return value === "1" || value.toLowerCase() === "true";
  });

export const portFromEnv = z.coerce.number().int().positive().max(65535);

/**
 * Native DNS-based service URLs — no custom discovery registry.
 * - local: localhost
 * - compose: Docker Compose service name
 * - kubernetes: cluster DNS (service.namespace.svc.cluster.local)
 */
export function resolveServiceBaseUrl(
  serviceName: string,
  port: number,
  deploymentEnv: DeploymentEnv,
  namespace = "default",
): string {
  switch (deploymentEnv) {
    case "local":
      return `http://127.0.0.1:${String(port)}`;
    case "compose":
      return `http://${serviceName}:${String(port)}`;
    case "kubernetes":
      return `http://${serviceName}.${namespace}.svc.cluster.local:${String(port)}`;
  }
}

export const DeploymentConfigSchema = z.object({
  DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
  K8S_NAMESPACE: z.string().min(1).default("default"),
  CONFIG_BACKEND: z.enum(["env", "none", "gcp-secret-manager", "gsm"]).default("env"),
  GCP_PROJECT_ID: z.string().min(1).optional(),
});

export const KafkaConfigSchema = z.object({
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .default("localhost:9092")
    .transform((value) =>
      value
        .split(",")
        .map((broker) => broker.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1)).min(1)),
  KAFKA_CLIENT_ID: z.string().min(1),
  KAFKA_GROUP_ID: z.string().min(1),
});

export type KafkaConfig = z.infer<typeof KafkaConfigSchema>;
