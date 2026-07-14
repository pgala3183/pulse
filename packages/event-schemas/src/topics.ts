export const KafkaTopics = {
  INGESTION_COMMANDS: "pulse.ingestion.commands",
  SENTIMENT_RESULTS: "pulse.sentiment.results",
  BRAND_MENTIONS: "pulse.brand.mentions",
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];
