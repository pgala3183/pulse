import { z } from "zod";
import { StreamSourcedBaseSchema } from "./platform.js";

export const ChatMessageEventSchema = StreamSourcedBaseSchema.extend({
  type: z.literal("chat.message"),
  messageId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  text: z.string(),
});
export type ChatMessageEvent = z.infer<typeof ChatMessageEventSchema>;
