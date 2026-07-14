import { z } from "zod";
import { StreamSourcedBaseSchema } from "./platform";

export const ChatMessageKindSchema = z.enum([
  "regular",
  "super_chat",
  "membership",
  "other",
]);
export type ChatMessageKind = z.infer<typeof ChatMessageKindSchema>;

export const ChatMessageEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("chat.message"),
  messageId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  text: z.string(),
  kind: ChatMessageKindSchema,
  /**
   * Paid amount in micros (e.g. Super Chat / membership). Present on YouTube
   * paid events; absent for Twitch and regular chat — a sponsor-relevance signal.
   */
  amountMicros: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).optional(),
});
export type ChatMessageEvent = z.infer<typeof ChatMessageEventSchema>;
