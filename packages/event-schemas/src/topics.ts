export const KafkaTopics = {
  INGESTION_COMMANDS: "pulse.ingestion.commands",
  CHAT_MESSAGES: "pulse.chat.messages",
  SENTIMENT_RESULTS: "pulse.sentiment.results",
  BRAND_MENTIONS: "pulse.brand.mentions",
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];
