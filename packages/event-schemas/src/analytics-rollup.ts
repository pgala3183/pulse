import { z } from "zod";
import { PlatformSchema } from "./platform";

export const AnalyticsWindowTypeSchema = z.enum(["1m", "5m", "session"]);
export type AnalyticsWindowType = z.infer<typeof AnalyticsWindowTypeSchema>;

export const AnalyticsRollupEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.literal("analytics.rollup"),
  platform: PlatformSchema,
  streamId: z.string().min(1),
  windowType: AnalyticsWindowTypeSchema,
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  occurredAt: z.string().datetime(),
  chatVolume: z.number().int().nonnegative(),
  paidChatVolume: z.number().int().nonnegative(),
  sentimentSampleCount: z.number().int().nonnegative(),
  averageSentimentScore: z.number().min(-1).max(1),
  positiveCount: z.number().int().nonnegative(),
  neutralCount: z.number().int().nonnegative(),
  negativeCount: z.number().int().nonnegative(),
  brandMentionCount: z.number().int().nonnegative(),
  uniqueBrands: z.array(z.string().min(1)),
  averageSponsorRelevance: z.number().min(0).max(1),
  engagementScore: z.number().int().nonnegative(),
});
export type AnalyticsRollupEvent = z.infer<typeof AnalyticsRollupEventSchema>;
