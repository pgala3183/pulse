import { z } from "zod";
import { AnalysisSourceSchema } from "./analysis-source";
import { StreamSourcedBaseSchema } from "./platform";

export const SentimentSourceTypeSchema = z.enum(["chat.message", "transcript.segment"]);
export type SentimentSourceType = z.infer<typeof SentimentSourceTypeSchema>;

export const SentimentLabelSchema = z.enum(["positive", "neutral", "negative"]);
export type SentimentLabel = z.infer<typeof SentimentLabelSchema>;

export { AnalysisSourceSchema } from "./analysis-source";
export type { AnalysisSource } from "./analysis-source";

export const SentimentResultEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("sentiment.result"),
  sourceEventId: z.string().uuid(),
  sourceType: SentimentSourceTypeSchema,
  label: SentimentLabelSchema,
  /** Continuous score in [-1, 1]; negative is negative sentiment. */
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  /**
   * Sponsor-relevance score in [0, 1]. Combines sentiment toward brand context,
   * keyword/brand matches, and paid chat signals (Super Chat / membership).
   * See docs/adr/0003-sponsor-relevance-scoring.md.
   */
  sponsorRelevance: z.number().min(0).max(1).optional(),
  analysisSource: AnalysisSourceSchema.optional(),
});
export type SentimentResultEvent = z.infer<typeof SentimentResultEventSchema>;
