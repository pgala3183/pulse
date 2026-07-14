import { Inject, Injectable } from "@nestjs/common";
import {
  TwitchChatAdapter,
  YoutubeChatAdapter,
  type ChatPlatform,
  type ChatSource,
} from "@pulse/platform-adapters";
import { APP_CONFIG, type ChatServiceConfig } from "./config";

export type CreateChatSourceInput = {
  platform: ChatPlatform;
  targetId: string;
};

@Injectable()
export class ChatAdapterFactory {
  constructor(@Inject(APP_CONFIG) private readonly config: ChatServiceConfig) {}

  create(input: CreateChatSourceInput): ChatSource {
    if (input.platform === "twitch") {
      return new TwitchChatAdapter({
        channel: input.targetId,
        username: this.config.twitchUsername,
        password: this.config.twitchOauthToken,
      });
    }

    if (!this.config.youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY is required for YouTube chat ingestion");
    }

    return new YoutubeChatAdapter({
      apiKey: this.config.youtubeApiKey,
      liveChatId: this.config.youtubeLiveChatId,
    });
  }
}
