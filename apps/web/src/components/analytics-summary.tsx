"use client";

import type { AnalyticsSummary } from "@/lib/graphql/types";

export function AnalyticsSummaryPanel({ summary }: { summary: AnalyticsSummary | undefined }) {
  if (!summary) {
    return <p className="text-sm text-ice/70">Analytics will populate after live events arrive.</p>;
  }

  const metrics = [
    { label: "Chat", value: summary.chatMessageCount.toLocaleString() },
    { label: "Sentiment n", value: summary.sentimentSampleCount.toLocaleString() },
    { label: "Avg score", value: summary.averageSentimentScore.toFixed(2) },
    { label: "Brands", value: summary.brandMentionCount.toLocaleString() },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-panel-edge/70 bg-ink-elevated/70 px-3 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ice/70">
              {metric.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-paper">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ice/70">Top brands</p>
        {summary.topBrands.length === 0 ? (
          <p className="mt-2 text-sm text-ice/60">None yet</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.topBrands.map((brand) => (
              <li
                key={brand}
                className="rounded-lg border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-xs text-signal-soft"
              >
                {brand}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="font-mono text-[10px] text-ice/50">
        Window {new Date(summary.windowStartedAt).toLocaleString()} →{" "}
        {new Date(summary.windowEndedAt).toLocaleString()}
      </p>
    </div>
  );
}
