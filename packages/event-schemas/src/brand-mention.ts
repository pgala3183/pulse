import { z } from "zod";
import { StreamSourcedBaseSchema } from "./platform";

export const BrandMentionSourceTypeSchema = z.enum([
  "chat.message",
  "transcript.segment",
  "video.frame",
]);
export type BrandMentionSourceType = z.infer<typeof BrandMentionSourceTypeSchema>;

export const BrandMentionEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("brand.mention"),
  sourceEventId: z.string().uuid(),
  sourceType: BrandMentionSourceTypeSchema,
  brand: z.string().min(1),
  mentionText: z.string().min(1),
  confidence: z.number().min(0).max(1),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional(),
}).refine(
  (mention) => {
    if (mention.startMs === undefined || mention.endMs === undefined) {
      return true;
    }
    return mention.endMs >= mention.startMs;
  },
  {
    message: "endMs must be greater than or equal to startMs when both are set",
    path: ["endMs"],
  },
);
export type BrandMentionEvent = z.infer<typeof BrandMentionEventSchema>;
