"use client";

import type { ChatMessage } from "@/lib/graphql/types";

function formatPaid(message: ChatMessage): string | null {
  if (message.amountMicros == null || !message.currency) {
    return null;
  }
  return `${(message.amountMicros / 1_000_000).toFixed(2)} ${message.currency}`;
}

export function ChatFeed({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-ice/70">Waiting for chat — start ingestion to light up the feed.</p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {messages.map((message, index) => {
        const paid = formatPaid(message);
        return (
          <li
            key={message.eventId}
            className="animate-rise-in rounded-lg border border-transparent px-2 py-1.5 hover:border-panel-edge/80 hover:bg-ink-elevated/60"
            style={{ animationDelay: `${String(Math.min(index, 8) * 30)}ms` }}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-ice/60">
                {new Date(message.occurredAt).toLocaleTimeString()}
              </span>
              <span className="font-semibold text-phosphor">{message.username}</span>
              {message.kind !== "REGULAR" ? (
                <span className="rounded bg-signal/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-signal-soft">
                  {message.kind.replace("_", " ")}
                </span>
              ) : null}
              {paid ? (
                <span className="font-mono text-[10px] text-warn">{paid}</span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm leading-snug text-paper/90">{message.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
