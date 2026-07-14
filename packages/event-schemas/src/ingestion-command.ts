import { z } from "zod";
import { PlatformSchema, StreamSourcedBaseSchema } from "./platform";

export const IngestionActionSchema = z.enum(["start", "stop"]);
export type IngestionAction = z.infer<typeof IngestionActionSchema>;

/** Command published by the API gateway to start or stop per-platform stream ingestion. */
export const IngestionCommandEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("ingestion.command"),
  action: IngestionActionSchema,
  /** Platform channel login (Twitch) or video/live ID (YouTube). */
  targetId: z.string().min(1),
});
export type IngestionCommandEvent = z.infer<typeof IngestionCommandEventSchema>;
