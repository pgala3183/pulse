/**
 * YouTube Data API quota-aware scheduler.
 *
 * Tracks daily unit consumption against the default project budget and delays
 * or queues work when remaining quota cannot cover the next request, rather
 * than firing and failing silently.
 */

export const YOUTUBE_DEFAULT_DAILY_QUOTA = 10_000;
/** liveChatMessages.list costs 5 quota units per call. */
export const YOUTUBE_LIVE_CHAT_LIST_COST = 5;

export type YoutubeQuotaLogger = {
  warn: (message: string, context?: Record<string, unknown>) => void;
};

export type YoutubeQuotaSchedulerOptions = {
  dailyBudget?: number;
  /** Fixed cost per scheduled unit of work (default: liveChatMessages.list). */
  unitCost?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  logger?: YoutubeQuotaLogger;
};

export type ScheduleResult =
  | { status: "executed"; remaining: number }
  | { status: "deferred"; remaining: number; retryAfterMs: number };

type QueuedWork = {
  cost: number;
  run: () => Promise<void>;
  resolve: (result: ScheduleResult) => void;
  reject: (error: unknown) => void;
};

export class YoutubeQuotaScheduler {
  private readonly dailyBudget: number;
  private readonly unitCost: number;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: YoutubeQuotaLogger;
  private used = 0;
  private dayKey: string;
  private queue: QueuedWork[] = [];
  private draining = false;

  constructor(options: YoutubeQuotaSchedulerOptions = {}) {
    this.dailyBudget = options.dailyBudget ?? YOUTUBE_DEFAULT_DAILY_QUOTA;
    this.unitCost = options.unitCost ?? YOUTUBE_LIVE_CHAT_LIST_COST;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.logger =
      options.logger ??
      ({
        warn: (message, context) => {
          console.warn(message, context ?? {});
        },
      } satisfies YoutubeQuotaLogger);
    this.dayKey = this.currentDayKey();
  }

  get remaining(): number {
    this.rollDayIfNeeded();
    return Math.max(0, this.dailyBudget - this.used);
  }

  get consumed(): number {
    this.rollDayIfNeeded();
    return this.used;
  }

  /** Test helper: set consumed units for the current UTC day. */
  setConsumed(units: number): void {
    this.rollDayIfNeeded();
    this.used = Math.max(0, units);
  }

  /**
   * Run `fn` immediately if quota allows; otherwise queue it and wait until
   * budget rolls over (or enough quota becomes free after deferred work).
   */
  async schedule<T>(fn: () => Promise<T>, cost = this.unitCost): Promise<T> {
    this.rollDayIfNeeded();

    if (this.remaining >= cost && this.queue.length === 0) {
      this.used += cost;
      return fn();
    }

    this.logger.warn("YouTube quota exhausted or busy; queueing request", {
      remaining: this.remaining,
      cost,
      queueDepth: this.queue.length + 1,
    });

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        cost,
        run: async () => {
          const value = await fn();
          resolve(value);
        },
        resolve: () => undefined,
        reject,
      });
      void this.drainQueue();
    });
  }

  /**
   * Probe whether a request can run now without executing it.
   */
  canAfford(cost = this.unitCost): ScheduleResult {
    this.rollDayIfNeeded();
    if (this.remaining >= cost) {
      return { status: "executed", remaining: this.remaining };
    }
    return {
      status: "deferred",
      remaining: this.remaining,
      retryAfterMs: this.msUntilNextDay(),
    };
  }

  private async drainQueue(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;

    try {
      while (this.queue.length > 0) {
        this.rollDayIfNeeded();
        const next = this.queue[0];
        if (!next) {
          break;
        }

        if (this.remaining < next.cost) {
          const waitMs = this.msUntilNextDay();
          this.logger.warn("Backing off until YouTube quota day rollover", {
            remaining: this.remaining,
            cost: next.cost,
            waitMs,
          });
          await this.sleep(waitMs);
          continue;
        }

        this.queue.shift();
        this.used += next.cost;
        try {
          await next.run();
        } catch (error) {
          next.reject(error);
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private rollDayIfNeeded(): void {
    const key = this.currentDayKey();
    if (key !== this.dayKey) {
      this.dayKey = key;
      this.used = 0;
    }
  }

  private currentDayKey(): string {
    return this.now().toISOString().slice(0, 10);
  }

  private msUntilNextDay(): number {
    const now = this.now();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.max(1, next.getTime() - now.getTime());
  }
}
