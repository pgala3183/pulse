import type { AnalyticsMetrics, AggregateInputEvent, WindowType } from "./metrics";
import {
  aggregateMetrics,
  aggregateMetricsForWindow,
  windowBoundsFor,
} from "./metrics";

export type StreamRollupKey = {
  platform: "twitch" | "youtube";
  streamId: string;
  windowType: WindowType;
  windowStart: string;
  windowEnd: string;
};

export type StreamRollup = StreamRollupKey & AnalyticsMetrics;

/**
 * In-memory aggregator that maintains 1m / 5m / session rollups per stream.
 */
export class StreamAnalyticsAggregator {
  private readonly events = new Map<string, AggregateInputEvent[]>();
  private readonly sessionStart = new Map<string, string>();

  ingest(platform: "twitch" | "youtube", streamId: string, event: AggregateInputEvent): StreamRollup[] {
    const streamKey = `${platform}:${streamId}`;
    const list = this.events.get(streamKey) ?? [];
    list.push(event);
    this.events.set(streamKey, list);

    if (!this.sessionStart.has(streamKey)) {
      this.sessionStart.set(streamKey, event.occurredAt);
    }

    return this.rollupsForEvent(platform, streamId, event.occurredAt);
  }

  snapshot(platform: "twitch" | "youtube", streamId: string): StreamRollup[] {
    const streamKey = `${platform}:${streamId}`;
    const list = this.events.get(streamKey) ?? [];
    if (list.length === 0) {
      return [];
    }
    const last = list[list.length - 1];
    if (!last) {
      return [];
    }
    return this.rollupsForEvent(platform, streamId, last.occurredAt);
  }

  private rollupsForEvent(
    platform: "twitch" | "youtube",
    streamId: string,
    occurredAt: string,
  ): StreamRollup[] {
    const streamKey = `${platform}:${streamId}`;
    const list = this.events.get(streamKey) ?? [];
    const one = windowBoundsFor(occurredAt, "1m");
    const five = windowBoundsFor(occurredAt, "5m");
    const sessionStart = this.sessionStart.get(streamKey) ?? occurredAt;

    return [
      {
        platform,
        streamId,
        ...one,
        ...aggregateMetricsForWindow(list, one.windowStart, one.windowEnd),
      },
      {
        platform,
        streamId,
        ...five,
        ...aggregateMetricsForWindow(list, five.windowStart, five.windowEnd),
      },
      {
        platform,
        streamId,
        windowType: "session",
        windowStart: sessionStart,
        windowEnd: occurredAt,
        ...aggregateMetrics(list),
      },
    ];
  }
}
