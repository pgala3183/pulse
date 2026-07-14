import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  resolveServiceBaseUrl,
  z,
} from "@pulse/config";

export const SentimentServiceConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    K8S_NAMESPACE: z.string().min(1).default("default"),
    PORT: portFromEnv.default(3004),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-sentiment-service"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-sentiment-service"),
    SENTIMENT_KAFKA_CONSUMER_DISABLED: booleanFromEnv.default(false),
    ML_SERVICE_URL: z.string().url().optional(),
  })
  .transform((raw) => ({
    deploymentEnv: raw.DEPLOYMENT_ENV,
    k8sNamespace: raw.K8S_NAMESPACE,
    port: raw.PORT,
    kafkaBrokers: raw.KAFKA_BROKERS.split(",")
      .map((b: string) => b.trim())
      .filter(Boolean),
    kafkaClientId: raw.KAFKA_CLIENT_ID,
    kafkaGroupId: raw.KAFKA_GROUP_ID,
    kafkaConsumerDisabled: raw.SENTIMENT_KAFKA_CONSUMER_DISABLED,
    mlServiceUrl:
      raw.ML_SERVICE_URL ??
      resolveServiceBaseUrl("ml-service", 8000, raw.DEPLOYMENT_ENV, raw.K8S_NAMESPACE),
  }));

export type SentimentServiceConfig = z.infer<typeof SentimentServiceConfigSchema>;
export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadSentimentServiceConfig(
  env?: NodeJS.ProcessEnv,
): Promise<SentimentServiceConfig> {
  return loadConfig(SentimentServiceConfigSchema, { env });
}
