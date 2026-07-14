import { z } from "zod";
import { StreamSourcedBaseSchema } from "./platform.js";

export const TranscriptSegmentEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("transcript.segment"),
  segmentId: z.string().min(1),
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  language: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
}).refine((segment) => segment.endMs >= segment.startMs, {
  message: "endMs must be greater than or equal to startMs",
  path: ["endMs"],
});
export type TranscriptSegmentEvent = z.infer<typeof TranscriptSegmentEventSchema>;
