export const KafkaTopics = {
  INGESTION_COMMANDS: "pulse.ingestion.commands",
  CHAT_MESSAGES: "pulse.chat.messages",
  VIDEO_FRAMES: "pulse.video.frames",
  TRANSCRIPT_SEGMENTS: "pulse.transcript.segments",
  SENTIMENT_RESULTS: "pulse.sentiment.results",
  BRAND_MENTIONS: "pulse.brand.mentions",
  ANALYTICS_ROLLUPS: "pulse.analytics.rollups",
  RECOMMENDATIONS: "pulse.recommendations",
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];
