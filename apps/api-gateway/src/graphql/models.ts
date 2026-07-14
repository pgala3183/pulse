import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { Platform, SentimentLabel, StreamIngestionStatus } from "./enums";

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
