import { z } from "zod";
import { PlatformSchema } from "./platform";

export const RecommendationSeveritySchema = z.enum(["info", "warning", "action"]);
export type RecommendationSeverity = z.infer<typeof RecommendationSeveritySchema>;

export const RecommendationEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.literal("recommendation.generated"),
  platform: PlatformSchema,
  streamId: z.string().min(1),
  occurredAt: z.string().datetime(),
  code: z.string().min(1),
  severity: RecommendationSeveritySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  relatedBrands: z.array(z.string()),
  windowType: z.enum(["1m", "5m", "session"]).optional(),
  evidence: z.record(z.unknown()).optional(),
});
export type RecommendationEvent = z.infer<typeof RecommendationEventSchema>;
