import { useEffect, useRef } from 'react';

const RADIALS = 14;
const RINGS = 9;
const BUILD_MS = 2600;

interface Anchor {
  x: number;
  y: number;
}

function radialEnd(cx: number, cy: number, i: number, rx: number, ry: number): Anchor {
  const angle = (i / RADIALS) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
}

function ringPoint(cx: number, cy: number, i: number, t: number, rx: number, ry: number): Anchor {
  const angle = (i / RADIALS) * Math.PI * 2 - Math.PI / 2;
  const sag = 1 - 0.06 * Math.sin((i / RADIALS) * Math.PI * 2 * 2);
  return { x: cx + Math.cos(angle) * rx * t * sag, y: cy + Math.sin(angle) * ry * t * sag };
}

function drawSpider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  phase: number,
  ink: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  const legs = [
    { hip: 5, knee: 13, foot: 17, kneeLift: 9 },
    { hip: 1.5, knee: 8, foot: 13, kneeLift: 11 },
    { hip: -1.5, knee: -3, foot: -9, kneeLift: 11 },
    { hip: -5, knee: -10, foot: -15, kneeLift: 9 },
  ];

  for (let side = -1; side <= 1; side += 2) {
    legs.forEach((leg, index) => {
      const swing = Math.sin(phase * 2 + index * 1.1 + (side > 0 ? Math.PI : 0)) * 1.6;
      ctx.beginPath();
      ctx.moveTo(leg.hip, side * 2);
      ctx.quadraticCurveTo(
        leg.knee,
        side * (leg.kneeLift + swing),
        leg.foot,
        side * (18 + swing * 0.6),
      );
      ctx.stroke();
    });
  }

  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(4, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-6, 0, 4.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function SpiderWeb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const styles = getComputedStyle(document.documentElement);
    const strand = styles.getPropertyValue('--color-line-strong').trim() || '#888';
    const ink = styles.getPropertyValue('--color-ink').trim() || '#111';
    const accent = styles.getPropertyValue('--color-accent').trim() || '#1e5138';

    let width = 0;
    let height = 0;
    let frame = 0;
    let start = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const build = reduced ? 1 : Math.min(elapsed / BUILD_MS, 1);

      const cx = width / 2;
      const cy = height * 0.44;
      const rx = Math.min(width * 0.42, 420);
      const ry = Math.min(height * 0.42, 340);

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const radialT = Math.min(build / 0.35, 1);
      ctx.strokeStyle = strand;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < RADIALS; i += 1) {
        const end = radialEnd(cx, cy, i, rx * radialT, ry * radialT);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      const ringsT = Math.max(0, (build - 0.3) / 0.7);
      for (let ring = 0; ring < RINGS; ring += 1) {
        const ringStart = ring / RINGS;
        const local = Math.max(0, Math.min((ringsT - ringStart * 0.55) / 0.45, 1));
        if (local <= 0) continue;
        const t = 0.18 + (ring / (RINGS - 1)) * 0.82;
        ctx.globalAlpha = 0.7 + (ring / RINGS) * 0.25;
        ctx.lineWidth = ring === RINGS - 1 ? 1.3 : 0.9;
        ctx.beginPath();
        const segments = Math.ceil(RADIALS * local);
        for (let i = 0; i <= segments; i += 1) {
          const point = ringPoint(cx, cy, i, t, rx, ry);
          if (i === 0) ctx.moveTo(point.x, point.y);
          else {
            const prev = ringPoint(cx, cy, i - 1, t, rx, ry);
            const mx = (prev.x + point.x) / 2;
            const my = (prev.y + point.y) / 2;
            const pull = 0.9;
            ctx.quadraticCurveTo(cx + (mx - cx) * pull, cy + (my - cy) * pull, point.x, point.y);
          }
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      if (build >= 0.62) {
        const crawl = reduced ? 0.5 : ((elapsed - BUILD_MS * 0.62) / 5200) % 1;
        const laps = crawl * Math.PI * 2;
        const ringT = 0.62 + Math.sin(crawl * Math.PI * 2) * 0.16;
        const sx = cx + Math.cos(laps - Math.PI / 2) * rx * ringT;
        const sy = cy + Math.sin(laps - Math.PI / 2) * ry * ringT;
        const heading = laps + Math.PI / 2;
        drawSpider(ctx, sx, sy, heading, 1.45, elapsed / 160, ink);

        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (!reduced) frame = requestAnimationFrame(render);
    };

    resize();
    frame = requestAnimationFrame(render);

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) {
        start = 0;
        requestAnimationFrame(render);
      }
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A spider web being spun, with a spider crawling across it"
      className="block h-[min(70vh,360px)] w-full"
    />
  );
}
