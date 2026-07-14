export const GRAPHQL_PUB_SUB = Symbol("GRAPHQL_PUB_SUB");

export const LIVE_CHANNELS = {
  sentiment: (streamId: string) => `sentiment.${streamId}`,
  brandMention: (streamId: string) => `brandMention.${streamId}`,
  chat: (streamId: string) => `chat.${streamId}`,
  recommendation: (streamId: string) => `recommendation.${streamId}`,
} as const;
