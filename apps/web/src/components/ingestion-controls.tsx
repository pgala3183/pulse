"use client";

import { useMutation } from "@apollo/client";
import { useState } from "react";
import { START_INGESTION, STOP_INGESTION } from "@/lib/graphql/operations";
import type {
  Platform,
  StartIngestionData,
  StopIngestionData,
  StreamIngestion,
} from "@/lib/graphql/types";

interface Props {
  streamId: string;
  platform: Platform;
  targetId: string;
  ingestion: StreamIngestion | null | undefined;
  onStreamIdChange: (value: string) => void;
  onPlatformChange: (value: Platform) => void;
  onTargetIdChange: (value: string) => void;
  onStarted: (ingestion: StreamIngestion) => void;
  onStopped: (ingestion: StreamIngestion) => void;
}

export function IngestionControls({
  streamId,
  platform,
  targetId,
  ingestion,
  onStreamIdChange,
  onPlatformChange,
  onTargetIdChange,
  onStarted,
  onStopped,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [startIngestion, { loading: starting }] = useMutation<StartIngestionData>(START_INGESTION);
  const [stopIngestion, { loading: stopping }] = useMutation<StopIngestionData>(STOP_INGESTION);

  const status = ingestion?.status ?? "IDLE";
  const isLive = status === "RUNNING" || status === "STARTING";

  async function handleStart() {
    setError(null);
    try {
      const result = await startIngestion({
        variables: {
          input: { platform, streamId, targetId },
        },
      });
      const next = result.data?.startStreamIngestion;
      if (next) {
        onStarted(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start ingestion");
    }
  }

  async function handleStop() {
    setError(null);
    try {
      const result = await stopIngestion({
        variables: {
          input: { platform, streamId },
        },
      });
      const next = result.data?.stopStreamIngestion;
      if (next) {
        onStopped(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop ingestion");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Platform"
          className="inline-flex rounded-xl border border-panel-edge bg-ink-elevated p-1"
        >
          {(["TWITCH", "YOUTUBE"] as const).map((option) => {
            const active = platform === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onPlatformChange(option);
                }}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                  active
                    ? "bg-signal text-ink shadow-[0_0_24px_rgba(255,90,43,0.35)]"
                    : "text-ice hover:text-paper"
                }`}
              >
                {option === "TWITCH" ? "Twitch" : "YouTube"}
              </button>
            );
          })}
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${
            isLive
              ? "border-phosphor/40 bg-phosphor/10 text-phosphor"
              : "border-panel-edge text-ice"
          }`}
        >
          <span
            className={`size-2 rounded-full ${isLive ? "animate-pulse-beat bg-phosphor" : "bg-ice/50"}`}
          />
          {status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/80">
            Stream ID
          </span>
          <input
            value={streamId}
            onChange={(event) => {
              onStreamIdChange(event.target.value);
            }}
            className="w-full rounded-xl border border-panel-edge bg-ink-elevated px-3 py-2.5 font-mono text-sm text-paper outline-none ring-signal/40 focus:ring-2"
            placeholder="stream-1"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/80">
            {platform === "TWITCH" ? "Channel login" : "Live / video ID"}
          </span>
          <input
            value={targetId}
            onChange={(event) => {
              onTargetIdChange(event.target.value);
            }}
            className="w-full rounded-xl border border-panel-edge bg-ink-elevated px-3 py-2.5 font-mono text-sm text-paper outline-none ring-signal/40 focus:ring-2"
            placeholder={platform === "TWITCH" ? "cool_streamer" : "videoId"}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={starting || !streamId || !targetId}
          onClick={() => {
            void handleStart();
          }}
          className="rounded-xl bg-signal px-4 py-2.5 font-display text-sm font-semibold text-ink transition hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {starting ? "Starting…" : "Start ingestion"}
        </button>
        <button
          type="button"
          disabled={stopping || !isLive}
          onClick={() => {
            void handleStop();
          }}
          className="rounded-xl border border-panel-edge px-4 py-2.5 font-display text-sm font-semibold text-paper transition hover:border-ice/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stopping ? "Stopping…" : "Stop"}
        </button>
      </div>

      {error ? <p className="text-sm text-signal-soft">{error}</p> : null}
    </div>
  );
}
