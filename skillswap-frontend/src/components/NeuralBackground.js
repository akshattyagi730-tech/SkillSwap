import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const NeuralBackground = () => {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const { dark }  = useTheme();

  useEffect(() => {
    const cv  = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, nodes, t = 0;

    // ── Colors based on theme ─────────────────────
    const nodeColor = dark
      ? '167,139,250'   // purple-ish in dark
      : '67,97,238';    // blue in light
    const lineColor = dark
      ? '167,139,250'
      : '67,97,238';
    const bgColor = dark
      ? 'rgba(15,17,23,1)'
      : 'rgba(247,248,252,1)';

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width  = W;
      cv.height = H;
    }

    function initNodes() {
      const count = Math.floor((W * H) / 18000);
      nodes = Array.from({ length: Math.min(Math.max(count, 28), 55) }, () => ({
        ox:    Math.random() * W,
        oy:    Math.random() * H,
        x:     0,
        y:     0,
        phase: Math.random() * Math.PI * 2,
        r:     2 + Math.random() * 2.5,
        speed: 0.6 + Math.random() * 0.8,
      }));
    }

    function draw() {
      t += 0.014;
      ctx.clearRect(0, 0, W, H);

      // background fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // update positions
      nodes.forEach(n => {
        n.x = n.ox + Math.sin(t * n.speed + n.phase) * 20;
        n.y = n.oy + Math.cos(t * n.speed * 0.75 + n.phase) * 15;
      });

      // draw connecting lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 160;
          if (dist < maxDist) {
            const pulse   = (Math.sin(t * 1.8 + i * 0.35) + 1) / 2;
            const alpha   = (1 - dist / maxDist) * 0.35 * pulse;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${lineColor},${alpha})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();
          }
        }
      }

      // draw nodes
      nodes.forEach(n => {
        const pulse = (Math.sin(t * 2 + n.phase) + 1) / 2;
        const glow  = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.5);
        glow.addColorStop(0, `rgba(${nodeColor},${0.5 + pulse * 0.5})`);
        glow.addColorStop(1, `rgba(${nodeColor},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.7 + pulse * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColor},${0.55 + pulse * 0.45})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    function init() {
      resize();
      initNodes();
      cancelAnimationFrame(rafRef.current);
      draw();
    }

    init();
    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', init);
    };
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:  'fixed',
        top:       0,
        left:      0,
        width:     '100vw',
        height:    '100vh',
        zIndex:    0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default NeuralBackground;