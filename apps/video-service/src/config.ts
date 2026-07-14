import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  resolveServiceBaseUrl,
  z,
} from "@pulse/config";

export const VideoServiceConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    K8S_NAMESPACE: z.string().min(1).default("default"),
    PORT: portFromEnv.default(3003),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-video-service"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-video-service"),
    VIDEO_KAFKA_CONSUMER_DISABLED: booleanFromEnv.default(false),
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
    kafkaConsumerDisabled: raw.VIDEO_KAFKA_CONSUMER_DISABLED,
    mlServiceUrl:
      raw.ML_SERVICE_URL ??
      resolveServiceBaseUrl("ml-service", 8000, raw.DEPLOYMENT_ENV, raw.K8S_NAMESPACE),
  }));

export type VideoServiceConfig = z.infer<typeof VideoServiceConfigSchema>;
export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadVideoServiceConfig(env?: NodeJS.ProcessEnv): Promise<VideoServiceConfig> {
  return loadConfig(VideoServiceConfigSchema, { env });
}
