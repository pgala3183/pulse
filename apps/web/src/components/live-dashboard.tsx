"use client";

import { useQuery, useSubscription } from "@apollo/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsSummaryPanel } from "@/components/analytics-summary";
import { BrandTimeline } from "@/components/brand-timeline";
import { ChatFeed } from "@/components/chat-feed";
import { IngestionControls } from "@/components/ingestion-controls";
import { Panel } from "@/components/panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { SentimentViz } from "@/components/sentiment-viz";
import {
  BRAND_SUB,
  CHAT_SUB,
  DASHBOARD_QUERY,
  RECOMMENDATION_SUB,
  SENTIMENT_SUB,
} from "@/lib/graphql/operations";
import type {
  BrandMention,
  BrandSubData,
  ChatMessage,
  ChatSubData,
  DashboardQueryData,
  Platform,
  Recommendation,
  RecommendationSubData,
  SentimentResult,
  SentimentSubData,
  StreamIngestion,
} from "@/lib/graphql/types";

function prependUnique<T extends { eventId: string }>(prev: T[], next: T, max = 80): T[] {
  if (prev.some((item) => item.eventId === next.eventId)) {
    return prev;
  }
  return [next, ...prev].slice(0, max);
}

export function LiveDashboard() {
  const [platform, setPlatform] = useState<Platform>("TWITCH");
  const [streamId, setStreamId] = useState("demo-stream");
  const [targetId, setTargetId] = useState("cool_streamer");
  const [ingestionOverride, setIngestionOverride] = useState<StreamIngestion | null>(null);

  const variables = useMemo(
    () => ({
      streamId,
      platform,
    }),
    [streamId, platform],
  );

  const { data, loading, error, refetch } = useQuery<DashboardQueryData>(DASHBOARD_QUERY, {
    variables,
    skip: !streamId,
  });

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [sentiment, setSentiment] = useState<SentimentResult[]>([]);
  const [brands, setBrands] = useState<BrandMention[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    setChat([]);
    setSentiment([]);
    setBrands([]);
    setRecommendations([]);
    setIngestionOverride(null);
  }, [streamId, platform]);

  useEffect(() => {
    if (!data) {
      return;
    }
    setChat(data.liveChat);
    setSentiment(data.liveSentiment);
    setBrands(data.liveBrandMentions);
    setRecommendations(data.liveRecommendations);
  }, [data]);

  useSubscription<ChatSubData>(CHAT_SUB, {
    variables: { streamId },
    skip: !streamId,
    onData: ({ data: sub }) => {
      const message = sub.data?.chatMessageUpdates;
      if (message) {
        setChat((prev) => prependUnique(prev, message));
      }
    },
  });

  useSubscription<SentimentSubData>(SENTIMENT_SUB, {
    variables: { streamId },
    skip: !streamId,
    onData: ({ data: sub }) => {
      const item = sub.data?.sentimentUpdates;
      if (item) {
        setSentiment((prev) => prependUnique(prev, item));
      }
    },
  });

  useSubscription<BrandSubData>(BRAND_SUB, {
    variables: { streamId },
    skip: !streamId,
    onData: ({ data: sub }) => {
      const item = sub.data?.brandMentionUpdates;
      if (item) {
        setBrands((prev) => prependUnique(prev, item));
      }
    },
  });

  useSubscription<RecommendationSubData>(RECOMMENDATION_SUB, {
    variables: { streamId },
    skip: !streamId,
    onData: ({ data: sub }) => {
      const item = sub.data?.recommendationUpdates;
      if (item) {
        setRecommendations((prev) => prependUnique(prev, item, 40));
      }
    },
  });

  const refresh = useCallback(() => {
    void refetch().then((result) => {
      setChat(result.data.liveChat);
      setSentiment(result.data.liveSentiment);
      setBrands(result.data.liveBrandMentions);
      setRecommendations(result.data.liveRecommendations);
    });
  }, [refetch]);

  const ingestion = ingestionOverride ?? data?.streamIngestion ?? null;

  return (
    <div className="space-y-6">
      <Panel title="Ingestion control" eyebrow="Stream source">
        <IngestionControls
          streamId={streamId}
          platform={platform}
          targetId={targetId}
          ingestion={ingestion}
          onStreamIdChange={setStreamId}
          onPlatformChange={setPlatform}
          onTargetIdChange={setTargetId}
          onStarted={(next) => {
            setIngestionOverride(next);
            refresh();
          }}
          onStopped={(next) => {
            setIngestionOverride(next);
            refresh();
          }}
        />
        {loading ? (
          <p className="mt-3 font-mono text-[11px] text-ice/60">Syncing gateway…</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-signal-soft">
            Gateway unreachable — is api-gateway on :3000? {error.message}
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel title="Live chat" eyebrow="Feed" className="h-[28rem] xl:col-span-4">
          <ChatFeed messages={chat} />
        </Panel>
        <Panel title="Sentiment" eyebrow="Signal" className="h-[28rem] xl:col-span-4">
          <SentimentViz results={sentiment} />
        </Panel>
        <Panel title="Brand mentions" eyebrow="Timeline" className="h-[28rem] xl:col-span-4">
          <BrandTimeline mentions={brands} />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Analytics summary" eyebrow="Session window">
          <AnalyticsSummaryPanel summary={data?.analyticsSummary} />
        </Panel>
        <Panel title="Recommendations" eyebrow="Operator cues">
          <RecommendationsPanel items={recommendations} />
        </Panel>
      </div>
    </div>
  );
}
