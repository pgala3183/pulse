import { pgTable, text, timestamp, uuid, real, jsonb } from "drizzle-orm/pg-core";

export const sponsorDetections = pgTable("sponsor_detections", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  streamId: text("stream_id").notNull(),
  platform: text("platform").notNull(),
  frameId: text("frame_id").notNull(),
  brand: text("brand").notNull(),
  mentionText: text("mention_text").notNull(),
  confidence: real("confidence").notNull(),
  analysisSource: text("analysis_source").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SponsorDetectionRow = typeof sponsorDetections.$inferSelect;
export type NewSponsorDetectionRow = typeof sponsorDetections.$inferInsert;
