import { Injectable } from "@nestjs/common";
import {
  TwitchChatAdapter,
  YoutubeChatAdapter,
  type ChatPlatform,
  type ChatSource,
} from "@pulse/platform-adapters";

export type CreateChatSourceInput = {
  platform: ChatPlatform;
  /** Twitch channel login or YouTube video/live ID used by the adapter. */
  targetId: string;
};

@Injectable()
export class ChatAdapterFactory {
  create(input: CreateChatSourceInput): ChatSource {
    if (input.platform === "twitch") {
      return new TwitchChatAdapter({
        channel: input.targetId,
        username: process.env["TWITCH_USERNAME"],
        password: process.env["TWITCH_OAUTH_TOKEN"],
      });
    }

    const apiKey = process.env["YOUTUBE_API_KEY"];
    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY is required for YouTube chat ingestion");
    }

    return new YoutubeChatAdapter({
      apiKey,
      liveChatId: process.env["YOUTUBE_LIVE_CHAT_ID"],
    });
  }
}
