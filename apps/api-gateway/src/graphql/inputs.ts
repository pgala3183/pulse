import { Field, InputType } from "@nestjs/graphql";
import { Platform } from "./enums";

@InputType()
export class StartStreamIngestionInput {
  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;

  @Field({ description: "Twitch channel login or YouTube live/video ID" })
  targetId!: string;
}

@InputType()
export class StopStreamIngestionInput {
  @Field(() => Platform)
  platform!: Platform;

  @Field()
  streamId!: string;
}
