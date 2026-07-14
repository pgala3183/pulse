"use client";

import type { SentimentLabel, SentimentResult } from "@/lib/graphql/types";

const LABEL_COLOR: Record<SentimentLabel, string> = {
  POSITIVE: "bg-phosphor",
  NEUTRAL: "bg-ice",
  NEGATIVE: "bg-signal",
};

export function SentimentViz({ results }: { results: SentimentResult[] }) {
  const latest = results.slice(0, 24);
  const avg =
    results.length === 0
      ? 0
      : results.reduce((sum, item) => sum + item.score, 0) / results.length;

  const counts = {
    POSITIVE: results.filter((item) => item.label === "POSITIVE").length,
    NEUTRAL: results.filter((item) => item.label === "NEUTRAL").length,
    NEGATIVE: results.filter((item) => item.label === "NEGATIVE").length,
  };
  const total = Math.max(results.length, 1);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/70">
            Rolling average
          </p>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-paper">
            {avg.toFixed(2)}
          </p>
        </div>
        <div className="animate-waveform flex h-12 items-end gap-1" aria-hidden>
          {Array.from({ length: 7 }).map((_, index) => (
            <span
              key={index}
              className="w-1.5 rounded-full bg-phosphor/80"
              style={{
                height: "100%",
                animationDelay: `${String(index * 0.12)}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-ink-elevated">
        <div
          className="bg-phosphor transition-all duration-500"
          style={{ width: `${String((counts.POSITIVE / total) * 100)}%` }}
        />
        <div
          className="bg-ice/70 transition-all duration-500"
          style={{ width: `${String((counts.NEUTRAL / total) * 100)}%` }}
        />
        <div
          className="bg-signal transition-all duration-500"
          style={{ width: `${String((counts.NEGATIVE / total) * 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] uppercase tracking-wider text-ice">
        <span>+ {counts.POSITIVE}</span>
        <span className="text-center">· {counts.NEUTRAL}</span>
        <span className="text-right">− {counts.NEGATIVE}</span>
      </div>

      <ul className="space-y-2">
        {latest.length === 0 ? (
          <li className="text-sm text-ice/70">No sentiment samples yet.</li>
        ) : (
          latest.map((item) => {
            const width = `${String(Math.round(((item.score + 1) / 2) * 100))}%`;
            return (
              <li key={item.eventId} className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-ice/70">
                  <span>{item.label}</span>
                  <span>{item.score.toFixed(2)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-elevated">
                  <div
                    className={`h-full rounded-full ${LABEL_COLOR[item.label]} transition-all duration-500`}
                    style={{ width }}
                  />
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
