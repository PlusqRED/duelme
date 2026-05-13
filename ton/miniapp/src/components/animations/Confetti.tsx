"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface ConfettiProps {
  count?: number;
  durationSec?: number;
}

const COLORS = ["#4fc3f7", "#a78bfa", "#3ddc97", "#ffb84f", "#ff6679"];

/**
 * Lightweight confetti burst. Renders absolutely-positioned divs above the
 * parent and animates them outward. Pure DOM, no canvas — keeps bundle size
 * minimal for the Mini App.
 */
export function Confetti({ count = 24, durationSec = 1.4 }: ConfettiProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = 80 + Math.random() * 60;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius - 20,
          delay: Math.random() * 0.12,
          rotate: 360 * (Math.random() * 2 - 1),
          size: 6 + Math.random() * 6,
        };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
          transition={{ duration: durationSec, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
