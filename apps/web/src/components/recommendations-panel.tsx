"use client";

import type { Recommendation, RecommendationSeverity } from "@/lib/graphql/types";

const SEVERITY_STYLE: Record<RecommendationSeverity, string> = {
  ACTION: "border-signal/50 bg-signal/10 text-signal-soft",
  WARNING: "border-warn/40 bg-warn/10 text-warn",
  INFO: "border-phosphor/35 bg-phosphor/10 text-phosphor",
};

export function RecommendationsPanel({ items }: { items: Recommendation[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ice/70">
        Operator recommendations appear when engagement, sentiment, or brand cues fire.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={item.eventId}
          className={`animate-rise-in rounded-xl border px-3 py-3 ${SEVERITY_STYLE[item.severity]}`}
          style={{ animationDelay: `${String(Math.min(index, 5) * 40)}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {item.severity}
            </span>
            <span className="font-mono text-[10px] opacity-70">{item.code}</span>
          </div>
          <p className="mt-1 font-display text-base font-semibold text-paper">{item.title}</p>
          <p className="mt-1 text-sm text-paper/80">{item.summary}</p>
          {item.relatedBrands.length > 0 ? (
            <p className="mt-2 font-mono text-[10px] opacity-70">
              {item.relatedBrands.join(" · ")}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
