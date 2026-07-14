import { pgTable, text, timestamp, uuid, real, jsonb } from "drizzle-orm/pg-core";

export const sentimentResults = pgTable("sentiment_results", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  streamId: text("stream_id").notNull(),
  platform: text("platform").notNull(),
  sourceEventId: uuid("source_event_id").notNull(),
  sourceType: text("source_type").notNull(),
  label: text("label").notNull(),
  score: real("score").notNull(),
  confidence: real("confidence").notNull(),
  sponsorRelevance: real("sponsor_relevance"),
  analysisSource: text("analysis_source").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
