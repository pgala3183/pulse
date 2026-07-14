import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  z,
} from "@pulse/config";

export const RecommendationServiceConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    PORT: portFromEnv.default(3006),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-recommendation-service"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-recommendation-service"),
    RECOMMENDATION_KAFKA_CONSUMER_DISABLED: booleanFromEnv.default(false),
  })
  .transform((raw) => ({
    deploymentEnv: raw.DEPLOYMENT_ENV,
    port: raw.PORT,
    kafkaBrokers: raw.KAFKA_BROKERS.split(",")
      .map((b: string) => b.trim())
      .filter(Boolean),
    kafkaClientId: raw.KAFKA_CLIENT_ID,
    kafkaGroupId: raw.KAFKA_GROUP_ID,
    kafkaConsumerDisabled: raw.RECOMMENDATION_KAFKA_CONSUMER_DISABLED,
  }));

export type RecommendationServiceConfig = z.infer<typeof RecommendationServiceConfigSchema>;
export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadRecommendationServiceConfig(
  env?: NodeJS.ProcessEnv,
): Promise<RecommendationServiceConfig> {
  return loadConfig(RecommendationServiceConfigSchema, { env });
}
