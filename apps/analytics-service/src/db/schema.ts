import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/** Drizzle table definition for durable analytics rollups (Postgres). */
export const analyticsRollups = pgTable("analytics_rollups", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  streamId: text("stream_id").notNull(),
  windowType: text("window_type").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  metrics: jsonb("metrics").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
