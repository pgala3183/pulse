import { describe, expect, it, vi } from "vitest";
import {
  YOUTUBE_DEFAULT_DAILY_QUOTA,
  YOUTUBE_LIVE_CHAT_LIST_COST,
  YoutubeQuotaScheduler,
} from "./youtube-quota";

describe("YoutubeQuotaScheduler", () => {
  it("executes immediately while budget remains", async () => {
    const scheduler = new YoutubeQuotaScheduler({
      dailyBudget: 20,
      unitCost: YOUTUBE_LIVE_CHAT_LIST_COST,
    });

    const value = await scheduler.schedule(async () => "ok");
    expect(value).toBe("ok");
    expect(scheduler.consumed).toBe(YOUTUBE_LIVE_CHAT_LIST_COST);
    expect(scheduler.remaining).toBe(20 - YOUTUBE_LIVE_CHAT_LIST_COST);
  });

  it("defers work when quota is exhausted instead of failing", async () => {
    let nowMs = Date.UTC(2026, 6, 13, 23, 59, 50);
    const sleep = vi.fn(async (ms: number) => {
      nowMs += ms;
    });
    const warn = vi.fn();

    const scheduler = new YoutubeQuotaScheduler({
      dailyBudget: YOUTUBE_LIVE_CHAT_LIST_COST,
      unitCost: YOUTUBE_LIVE_CHAT_LIST_COST,
      now: () => new Date(nowMs),
      sleep,
      logger: { warn },
    });

    // Exhaust the day's budget with the first call.
    await scheduler.schedule(async () => "first");
    expect(scheduler.remaining).toBe(0);

    const deferred = scheduler.schedule(async () => "second");
    // Allow the drain loop to sleep past day boundary and resume.
    await Promise.resolve();
    await deferred;

    expect(sleep).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(await deferred).toBe("second");
  });

  it("reports deferred status via canAfford when budget is too low", () => {
    const scheduler = new YoutubeQuotaScheduler({
      dailyBudget: YOUTUBE_DEFAULT_DAILY_QUOTA,
      unitCost: YOUTUBE_LIVE_CHAT_LIST_COST,
    });
    scheduler.setConsumed(YOUTUBE_DEFAULT_DAILY_QUOTA);

    const result = scheduler.canAfford();
    expect(result.status).toBe("deferred");
    if (result.status === "deferred") {
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("resets consumed units on UTC day rollover", () => {
    let nowMs = Date.UTC(2026, 6, 13, 12, 0, 0);
    const scheduler = new YoutubeQuotaScheduler({
      dailyBudget: 100,
      now: () => new Date(nowMs),
    });
    scheduler.setConsumed(90);
    expect(scheduler.remaining).toBe(10);

    nowMs = Date.UTC(2026, 6, 14, 0, 0, 1);
    expect(scheduler.remaining).toBe(100);
    expect(scheduler.consumed).toBe(0);
  });
});
