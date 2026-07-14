import { describe, expect, it } from "vitest";
import { ChatFeed } from "@/components/chat-feed";
import { SentimentViz } from "@/components/sentiment-viz";
import type { ChatMessage, SentimentResult } from "@/lib/graphql/types";
import { renderToStaticMarkup } from "react-dom/server";

describe("dashboard panels", () => {
  it("renders empty chat state", () => {
    const html = renderToStaticMarkup(<ChatFeed messages={[]} />);
    expect(html).toContain("Waiting for chat");
  });

  it("renders sentiment samples", () => {
    const samples: SentimentResult[] = [
      {
        eventId: "1",
        label: "POSITIVE",
        score: 0.8,
        confidence: 0.9,
        occurredAt: "2026-07-13T21:00:00.000Z",
        sourceType: "chat.message",
      },
    ];
    const html = renderToStaticMarkup(<SentimentViz results={samples} />);
    expect(html).toContain("0.80");
    expect(html).toContain("POSITIVE");
  });

  it("renders chat usernames", () => {
    const messages: ChatMessage[] = [
      {
        eventId: "m1",
        username: "nova",
        text: "hype",
        kind: "REGULAR",
        occurredAt: "2026-07-13T21:00:00.000Z",
      },
    ];
    const html = renderToStaticMarkup(<ChatFeed messages={messages} />);
    expect(html).toContain("nova");
    expect(html).toContain("hype");
  });
});
