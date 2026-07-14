import { LiveDashboard } from "@/components/live-dashboard";

/** SSR shell: brand + layout; live panels hydrate client-side via Apollo. */
export default function HomePage() {
  return (
    <div className="relative min-h-screen grid-scan">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,43,0.12),_transparent_65%)]" />

      <header className="relative mx-auto max-w-7xl px-6 pb-2 pt-10 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-phosphor">
              Live stream intelligence
            </p>
            <h1 className="mt-2 font-display text-6xl font-bold tracking-tight text-paper md:text-7xl">
              Pulse
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-ice">
              Watch Twitch and YouTube chat mood, sponsor hits, and operator cues as the stream
              breathes.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel/60 px-4 py-3 backdrop-blur">
            <span className="animate-pulse-beat size-2.5 rounded-full bg-signal" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/70">
                Control room
              </p>
              <p className="font-display text-sm font-semibold text-paper">Realtime GraphQL</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-16 pt-8">
        <LiveDashboard />
      </main>
    </div>
  );
}
