import { z } from "zod";
import { StreamSourcedBaseSchema } from "./platform.js";

/**
 * A captured video frame reference. Binary data lives in object storage;
 * Kafka carries metadata + a durable payload reference.
 */
export const VideoFrameEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("video.frame"),
  frameId: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
  payloadRef: z.string().min(1),
});
export type VideoFrameEvent = z.infer<typeof VideoFrameEventSchema>;
