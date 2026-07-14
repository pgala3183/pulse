import { z } from "zod";

export const AnalysisSourceSchema = z.enum(["ml", "lexical_fallback"]);
export type AnalysisSource = z.infer<typeof AnalysisSourceSchema>;
