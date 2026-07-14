import {
  DeploymentEnvSchema,
  booleanFromEnv,
  loadConfig,
  portFromEnv,
  z,
} from "@pulse/config";

export const ChatServiceConfigSchema = z
  .object({
    DEPLOYMENT_ENV: DeploymentEnvSchema.default("local"),
    PORT: portFromEnv.default(3002),
    KAFKA_BROKERS: z.string().min(1).default("localhost:9092"),
    KAFKA_CLIENT_ID: z.string().min(1).default("pulse-chat-service"),
    KAFKA_GROUP_ID: z.string().min(1).default("pulse-chat-service"),
    CHAT_KAFKA_CONSUMER_DISABLED: booleanFromEnv.default(false),
    TWITCH_USERNAME: z.string().min(1).optional(),
    TWITCH_OAUTH_TOKEN: z.string().min(1).optional(),
    YOUTUBE_API_KEY: z.string().min(1).optional(),
    YOUTUBE_LIVE_CHAT_ID: z.string().min(1).optional(),
  })
  .transform((raw) => ({
    deploymentEnv: raw.DEPLOYMENT_ENV,
    port: raw.PORT,
    kafkaBrokers: raw.KAFKA_BROKERS.split(",")
      .map((b: string) => b.trim())
      .filter(Boolean),
    kafkaClientId: raw.KAFKA_CLIENT_ID,
    kafkaGroupId: raw.KAFKA_GROUP_ID,
    kafkaConsumerDisabled: raw.CHAT_KAFKA_CONSUMER_DISABLED,
    twitchUsername: raw.TWITCH_USERNAME,
    twitchOauthToken: raw.TWITCH_OAUTH_TOKEN,
    youtubeApiKey: raw.YOUTUBE_API_KEY,
    youtubeLiveChatId: raw.YOUTUBE_LIVE_CHAT_ID,
  }));

export type ChatServiceConfig = z.infer<typeof ChatServiceConfigSchema>;
export const APP_CONFIG = Symbol("APP_CONFIG");

export function loadChatServiceConfig(env?: NodeJS.ProcessEnv): Promise<ChatServiceConfig> {
  return loadConfig(ChatServiceConfigSchema, { env });
}
