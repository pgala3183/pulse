import type { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-panel-edge/80 bg-panel/75 shadow-[inset_0_1px_0_rgba(231,238,232,0.04)] backdrop-blur-sm ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-panel-edge/70 px-4 py-3">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ice/70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-lg font-semibold tracking-tight text-paper">{title}</h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </section>
  );
}
