import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import {
  ChatMessageKind,
  Platform,
  RecommendationSeverity,
  SentimentLabel,
  StreamIngestionStatus,
} from "./enums";

@ObjectType()
export class StreamIngestion {
  @Field()
  streamId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field()
  targetId!: string;

  @Field(() => StreamIngestionStatus)
  status!: StreamIngestionStatus;

  @Field()
  updatedAt!: string;
}

@ObjectType()
export class SentimentResult {
  @Field()
  eventId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  sourceEventId!: string;

  @Field()
  sourceType!: string;

  @Field(() => SentimentLabel)
  label!: SentimentLabel;

  @Field(() => Float)
  score!: number;

  @Field(() => Float)
  confidence!: number;
}

@ObjectType()
export class BrandMention {
  @Field()
  eventId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  sourceEventId!: string;

  @Field()
  sourceType!: string;

  @Field()
  brand!: string;

  @Field()
  mentionText!: string;

  @Field(() => Float)
  confidence!: number;

  @Field(() => Int, { nullable: true })
  startMs?: number | null;

  @Field(() => Int, { nullable: true })
  endMs?: number | null;
}

@ObjectType()
export class ChatMessage {
  @Field()
  eventId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  messageId!: string;

  @Field()
  userId!: string;

  @Field()
  username!: string;

  @Field()
  text!: string;

  @Field(() => ChatMessageKind)
  kind!: ChatMessageKind;

  @Field(() => Int, { nullable: true })
  amountMicros?: number | null;

  @Field(() => String, { nullable: true })
  currency?: string | null;
}

@ObjectType()
export class Recommendation {
  @Field()
  eventId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  code!: string;

  @Field(() => RecommendationSeverity)
  severity!: RecommendationSeverity;

  @Field()
  title!: string;

  @Field()
  summary!: string;

  @Field(() => [String])
  relatedBrands!: string[];

  @Field(() => String, { nullable: true })
  windowType?: string | null;
}

@ObjectType()
export class AnalyticsSummary {
  @Field()
  streamId!: string;

  @Field(() => Platform)
  platform!: Platform;

  @Field(() => Int)
  chatMessageCount!: number;

  @Field(() => Int)
  sentimentSampleCount!: number;

  @Field(() => Float)
  averageSentimentScore!: number;

  @Field(() => Int)
  brandMentionCount!: number;

  @Field(() => [String])
  topBrands!: string[];

  @Field()
  windowStartedAt!: string;

  @Field()
  windowEndedAt!: string;
}
