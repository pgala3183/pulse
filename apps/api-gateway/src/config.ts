import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  resolveServiceBaseUrl,
  z,
} from "@pulse/config";

export const ApiGatewayConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    K8S_NAMESPACE: z.string().min(1).default("default"),
    PORT: portFromEnv.default(3000),
    PULSE_API_KEY: z.string().min(1).default("dev-api-key"),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-api-gateway"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-api-gateway"),
    KAFKA_BRIDGE_DISABLED: booleanFromEnv.default(false),
    KAFKA_PUBLISH_DISABLED: booleanFromEnv.default(false),
    ML_SERVICE_URL: z.string().url().optional(),
  })
  .transform((raw) => {
    const kafkaBrokers = raw.KAFKA_BROKERS.split(",")
      .map((broker: string) => broker.trim())
      .filter(Boolean);
    return {
      deploymentEnv: raw.DEPLOYMENT_ENV,
      k8sNamespace: raw.K8S_NAMESPACE,
      port: raw.PORT,
      apiKey: raw.PULSE_API_KEY,
      kafkaBrokers,
      kafkaClientId: raw.KAFKA_CLIENT_ID,
      kafkaGroupId: raw.KAFKA_GROUP_ID,
      kafkaBridgeDisabled: raw.KAFKA_BRIDGE_DISABLED,
      kafkaPublishDisabled: raw.KAFKA_PUBLISH_DISABLED,
      mlServiceUrl:
        raw.ML_SERVICE_URL ??
        resolveServiceBaseUrl("ml-service", 8000, raw.DEPLOYMENT_ENV, raw.K8S_NAMESPACE),
    };
  });

export type ApiGatewayConfig = z.infer<typeof ApiGatewayConfigSchema>;

export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadApiGatewayConfig(env?: NodeJS.ProcessEnv): Promise<ApiGatewayConfig> {
  return loadConfig(ApiGatewayConfigSchema, { env });
}
