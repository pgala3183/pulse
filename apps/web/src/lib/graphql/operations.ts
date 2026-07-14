import { gql } from "@apollo/client";

export const DASHBOARD_QUERY = gql`
  query DashboardLive($streamId: String!, $platform: Platform!) {
    streamIngestion(platform: $platform, streamId: $streamId) {
      streamId
      platform
      targetId
      status
      updatedAt
    }
    liveChat(streamId: $streamId, limit: 40) {
      eventId
      username
      text
      kind
      occurredAt
      amountMicros
      currency
    }
    liveSentiment(streamId: $streamId, limit: 40) {
      eventId
      label
      score
      confidence
      occurredAt
      sourceType
    }
    liveBrandMentions(streamId: $streamId, limit: 40) {
      eventId
      brand
      mentionText
      confidence
      occurredAt
      sourceType
    }
    analyticsSummary(streamId: $streamId, platform: $platform) {
      streamId
      platform
      chatMessageCount
      sentimentSampleCount
      averageSentimentScore
      brandMentionCount
      topBrands
      windowStartedAt
      windowEndedAt
    }
    liveRecommendations(streamId: $streamId, limit: 20) {
      eventId
      code
      severity
      title
      summary
      relatedBrands
      occurredAt
      windowType
    }
  }
`;

export const START_INGESTION = gql`
  mutation StartStreamIngestion($input: StartStreamIngestionInput!) {
    startStreamIngestion(input: $input) {
      streamId
      platform
      targetId
      status
      updatedAt
    }
  }
`;

export const STOP_INGESTION = gql`
  mutation StopStreamIngestion($input: StopStreamIngestionInput!) {
    stopStreamIngestion(input: $input) {
      streamId
      platform
      targetId
      status
      updatedAt
    }
  }
`;

export const CHAT_SUB = gql`
  subscription ChatMessageUpdates($streamId: String!) {
    chatMessageUpdates(streamId: $streamId) {
      eventId
      username
      text
      kind
      occurredAt
      amountMicros
      currency
    }
  }
`;

export const SENTIMENT_SUB = gql`
  subscription SentimentUpdates($streamId: String!) {
    sentimentUpdates(streamId: $streamId) {
      eventId
      label
      score
      confidence
      occurredAt
      sourceType
    }
  }
`;

export const BRAND_SUB = gql`
  subscription BrandMentionUpdates($streamId: String!) {
    brandMentionUpdates(streamId: $streamId) {
      eventId
      brand
      mentionText
      confidence
      occurredAt
      sourceType
    }
  }
`;

export const RECOMMENDATION_SUB = gql`
  subscription RecommendationUpdates($streamId: String!) {
    recommendationUpdates(streamId: $streamId) {
      eventId
      code
      severity
      title
      summary
      relatedBrands
      occurredAt
      windowType
    }
  }
`;
