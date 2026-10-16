import { useEffect, useRef } from 'react';

function flake(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    const c = Math.cos(a), s = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.lineTo(x + c * r, y + s * r);
    for (const t of [0.45, 0.72]) {
      const bx = x + c * r * t, by = y + s * r * t, bl = r * 0.28;
      for (const d of [-0.6, 0.6]) {
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + d) * bl, by + Math.sin(a + d) * bl);
      }
    }
  }
  ctx.stroke();
}

export default function IceBackground() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const mobile = window.innerWidth < 768;
    const MAX_SNOW = mobile ? 40 : 110;
    let w, h, raf, t = 0;
    const snow = [];
    const crystals = [
      { fx: 0.96, fy: 0.88, r: 260, sp: 0.0006 },
      { fx: 0.02, fy: 0.92, r: 200, sp: -0.0005 },
      { fx: 0.97, fy: 0.22, r: 150, sp: 0.0004 },
      { fx: 0.03, fy: 0.4, r: 120, sp: -0.0007 },
    ];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const addSnow = (anywhere) => {
      const shard = Math.random() < 0.25;
      snow.push({
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -10,
        vy: 0.4 + Math.random() * 1.1,
        sway: Math.random() * Math.PI * 2,
        r: shard ? 2 + Math.random() * 2.5 : 2 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.03,
        a: 0.4 + Math.random() * 0.5,
        shard,
      });
    };
    for (let i = 0; i < MAX_SNOW; i++) addSnow(true);

    const tick = () => {
      t++;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      for (const c of crystals) {
        const x = c.fx * w, y = c.fy * h, rot = t * c.sp * 16;
        ctx.strokeStyle = 'rgba(110, 200, 255, 0.10)';
        ctx.lineWidth = 7;
        flake(ctx, x, y, c.r, rot);
        ctx.strokeStyle = 'rgba(190, 235, 255, 0.35)';
        ctx.lineWidth = 1.6;
        flake(ctx, x, y, c.r, rot);
      }

      for (const p of snow) {
        p.sway += 0.02;
        p.x += Math.sin(p.sway) * 0.5;
        p.y += p.vy;
        p.rot += p.spin;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.shard) {
          const tw = 0.5 + 0.5 * Math.sin(t * 0.08 + p.sway * 3);
          ctx.fillStyle = `rgba(200, 240, 255, ${p.a * tw})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.r * 1.4);
          ctx.lineTo(p.x + p.r, p.y);
          ctx.lineTo(p.x, p.y + p.r * 1.4);
          ctx.lineTo(p.x - p.r, p.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(210, 240, 255, ${p.a})`;
          ctx.lineWidth = 1;
          flake(ctx, p.x, p.y, p.r, p.rot);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="fire-canvas ice-canvas" aria-hidden="true" />;
}
