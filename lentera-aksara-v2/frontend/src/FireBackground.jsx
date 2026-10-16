import { useEffect, useRef } from "react";

export default function FireBackground() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const mobile = window.innerWidth < 768;
    const MAX_FLAMES = mobile ? 110 : 260;
    const MAX_SPARKS = mobile ? 15 : 45;
    let w, h, raf;
    const flames = [];
    const sparks = [];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnX = () => {
      const r = Math.random();
      if (r < 0.3) return Math.random() * w * 0.2;
      if (r < 0.6) return w - Math.random() * w * 0.2;
      return Math.random() * w;
    };

    const addFlame = () => {
      const x = spawnX();
      const edge = Math.min(x, w - x) / w;
      flames.push({
        x,
        y: h + 30,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(1.5 + Math.random() * 2.5),
        life: 1,
        decay: (edge < 0.2 ? 0.005 : 0.011) + Math.random() * 0.006,
        size: 50 + Math.random() * 80,
        wob: Math.random() * Math.PI * 2,
      });
    };

    const addSpark = () => {
      sparks.push({
        x: spawnX(),
        y: h + 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1 + Math.random() * 3),
        life: 1,
        decay: 0.004 + Math.random() * 0.006,
        r: 1 + Math.random() * 2,
      });
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < 6 && flames.length < MAX_FLAMES; i++) addFlame();
      if (Math.random() < 0.5 && sparks.length < MAX_SPARKS) addSpark();

      for (let i = flames.length - 1; i >= 0; i--) {
        const p = flames[i];
        p.wob += 0.08;
        p.x += p.vx + Math.sin(p.wob) * 0.8;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) { flames.splice(i, 1); continue; }
        const r = p.size * p.life;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        const hue = 8 + p.life * 38;
        g.addColorStop(0, `hsla(${hue + 12}, 100%, 60%, ${p.life * 0.16})`);
        g.addColorStop(1, `hsla(${hue}, 100%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(s.y * 0.03) * 0.6;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 180, 70, ${s.life})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="fire-canvas" aria-hidden="true" />;
}
