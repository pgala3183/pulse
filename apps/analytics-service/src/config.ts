import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  z,
} from "@pulse/config";

export const AnalyticsServiceConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    PORT: portFromEnv.default(3005),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-analytics-service"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-analytics-service"),
    ANALYTICS_KAFKA_CONSUMER_DISABLED: booleanFromEnv.default(false),
  })
  .transform((raw) => ({
    deploymentEnv: raw.DEPLOYMENT_ENV,
    port: raw.PORT,
    kafkaBrokers: raw.KAFKA_BROKERS.split(",")
      .map((b: string) => b.trim())
      .filter(Boolean),
    kafkaClientId: raw.KAFKA_CLIENT_ID,
    kafkaGroupId: raw.KAFKA_GROUP_ID,
    kafkaConsumerDisabled: raw.ANALYTICS_KAFKA_CONSUMER_DISABLED,
  }));

export type AnalyticsServiceConfig = z.infer<typeof AnalyticsServiceConfigSchema>;
export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadAnalyticsServiceConfig(
  env?: NodeJS.ProcessEnv,
): Promise<AnalyticsServiceConfig> {
  return loadConfig(AnalyticsServiceConfigSchema, { env });
}
