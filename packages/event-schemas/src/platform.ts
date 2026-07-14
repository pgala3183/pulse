import { z } from "zod";

/** Platforms Pulse ingests live content from. Required on every stream-sourced event. */
export const PlatformSchema = z.enum(["twitch", "youtube"]);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Fields shared by every event that originates from a live stream.
 * `platform` is first-class so consumers never have to infer source from IDs.
 */
export const StreamSourcedBaseSchema = z.object({
  eventId: z.string().uuid(),
  platform: PlatformSchema,
  streamId: z.string().min(1),
  occurredAt: z.string().datetime(),
});
export type StreamSourcedBase = z.infer<typeof StreamSourcedBaseSchema>;
