# Demo guide — Twitch & YouTube end-to-end

This guide is the **operator script** for showing Pulse working through the dashboard for both
platforms. Use it for screen recordings, hiring-loop walkthroughs, or local smoke tests.

## What “end-to-end” means here

| Path | What you show |
| --- | --- |
| **A. Synthetic (always available)** | `make demo-seed` publishes chat + sentiment + brands + recommendations; dashboard platform selector switches **Twitch** ↔ **YouTube** while live GraphQL subscriptions update panels |
| **B. Live adapters** | Real Twitch IRC and/or YouTube Data API poll; same dashboard mutations (`startStreamIngestion` / `stopStreamIngestion`) |

Path A does not require a real creator stream. Path B needs credentials and an active chat.

---

## Path A — Recordable demo without a live stream (~3–5 minutes)

### Prep

```bash
pnpm install && pnpm build
make up                 # wait until api-gateway and web are healthy
make demo-seed          # DEMO_PLATFORM=twitch by default
```

Optional second seed for YouTube labeling:

```bash
# PowerShell
$env:DEMO_PLATFORM="youtube"; $env:DEMO_STREAM_ID="demo-yt"; $env:DEMO_TARGET_ID="VIDEO_ID_PLACEHOLDER"; pnpm demo-seed
```

### Recording checklist (screen capture)

1. **Open** http://localhost:3001 — brand hero “Pulse” visible (SSR shell).
2. **Twitch**
   - Platform selector → **Twitch**
   - Stream ID `demo-stream`, channel `cool_streamer`
   - Click **Start ingestion** (status → `RUNNING`)
   - Show live chat rows, sentiment bars, brand timeline (Acme / PulsePay / NovaEnergy),
     analytics summary, recommendation card
3. **YouTube**
   - Switch platform → **YouTube**
   - Stream ID `demo-yt` (if seeded) or re-run seed with `DEMO_PLATFORM=youtube`
   - Start ingestion with a video ID field filled
   - Point out Super Chat styling / paid kind when present in seeded data
4. **Optional ops cut**
   - Grafana http://localhost:3008 — chat throughput / sentiment / brand rate panels
   - Zipkin http://localhost:9411 — search `api-gateway` spans after seeding

### Suggested narration

> Pulse normalizes Twitch and YouTube behind one ChatSource adapter. The dashboard only speaks
> GraphQL. Sponsor-relevance blends sentiment, brand confidence, and YouTube paid signals so
> operators see sponsorship-worthy moments—not just chat volume.

Attach the finished video URL in the GitHub repo **About** homepage field and update
[pulse-demo.md](./demo/pulse-demo.md).

---

## Path B — Live platforms

### Twitch

1. Export identity if using authenticated chat: `TWITCH_USERNAME`, `TWITCH_OAUTH` (as required
   by your chat-service config).
2. Dashboard: platform **Twitch**, `targetId` = channel login, unique `streamId`.
3. **Start ingestion** → confirm `chat-service` joins IRC and Kafka `pulse.chat.messages`
   advances → gateway subscriptions update the UI.

### YouTube

1. Set `YOUTUBE_API_KEY` on `chat-service` (Compose env or local `.env`).
2. Dashboard: platform **YouTube**, `targetId` = live **video** ID.
3. Watch quota-aware polling (`YoutubeQuotaScheduler`); Super Chats appear with
   `amountMicros` / `currency`.

Stop with **Stop** on the dashboard (publishes `ingestion.command` `action: stop`).

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Gateway unreachable on dashboard | `docker compose ps`; gateway `:3000`; API key `dev-api-key` |
| Seed warns on mutation | Gateway not up yet — Kafka events still publish; retry seed |
| Empty panels | Confirm stream ID matches seed; subscription needs browser WebSocket to `/graphql` |
| Live YouTube 403 | API key / quota; check chat-service logs for quota scheduler deferrals |
