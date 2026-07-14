"use client";

import type { BrandMention } from "@/lib/graphql/types";

export function BrandTimeline({ mentions }: { mentions: BrandMention[] }) {
  if (mentions.length === 0) {
    return (
      <p className="text-sm text-ice/70">
        Sponsor and brand mentions will land here as the stream talks.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-panel-edge pl-4">
      {mentions.map((mention, index) => (
        <li
          key={mention.eventId}
          className="animate-rise-in relative pb-5"
          style={{ animationDelay: `${String(Math.min(index, 6) * 40)}ms` }}
        >
          <span className="absolute -left-[1.125rem] top-1 size-2.5 rounded-full bg-signal shadow-[0_0_12px_rgba(255,90,43,0.6)]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ice/60">
            {new Date(mention.occurredAt).toLocaleTimeString()} · {mention.sourceType}
          </p>
          <p className="mt-1 font-display text-base font-semibold text-signal-soft">
            {mention.brand}
          </p>
          <p className="mt-0.5 text-sm text-paper/85">&ldquo;{mention.mentionText}&rdquo;</p>
          <p className="mt-1 font-mono text-[10px] text-ice/55">
            conf {(mention.confidence * 100).toFixed(0)}%
          </p>
        </li>
      ))}
    </ol>
  );
}
