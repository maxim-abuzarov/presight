import { Suspense, lazy } from 'react';

const PresightLogo = lazy(() => import('./PresightLogo.tsx'));

export function Presight() {
  return (
    <div className="presight-card relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-line bg-surface px-6 py-24">
      <div
        aria-hidden="true"
        className="presight-glow pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 60% at 50% 50%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 72%)',
        }}
      />
      <div className="presight-mark relative w-[min(400px,72vw)] text-ink">
        <Suspense fallback={<div style={{ aspectRatio: '161 / 47' }} />}>
          <PresightLogo className="h-auto w-full" />
        </Suspense>
      </div>
      <span
        aria-hidden="true"
        className="presight-sweep relative mt-8 block h-1 w-[min(320px,58vw)] rounded-full bg-accent"
      />
    </div>
  );
}
