import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Platform } from "@pulse/event-schemas";
import { ChatIngestionService } from "./chat-ingestion.service";

type StartBody = {
  platform: Platform;
  streamId: string;
  targetId: string;
};

@Controller("chat")
export class ChatController {
  constructor(private readonly ingestion: ChatIngestionService) {}

  @Get("sessions")
  listSessions() {
    return this.ingestion.listSessions();
  }

  @Post("ingestions/start")
  async start(@Body() body: StartBody) {
    await this.ingestion.start(body);
    return { status: "started", ...body };
  }

  @Post("ingestions/:platform/:streamId/stop")
  async stop(
    @Param("platform") platform: Platform,
    @Param("streamId") streamId: string,
  ) {
    await this.ingestion.stop(platform, streamId);
    return { status: "stopped", platform, streamId };
  }
}
