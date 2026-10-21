'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface AutoplayControls {
  play: () => void;
  pause: () => void;
  playing: RefObject<boolean>;
  touched: RefObject<boolean>;
}

/**
 * Plays the demo once on its own the first time it is mostly on screen, unless motion is reduced.
 * That play holds while the demo is scrolled away and goes on when it is back, so it is never spent
 * unseen; once the visitor takes over, it is theirs. It reads the latest `play` and `pause`, so a
 * new language, which makes new ones, neither restarts the watch nor replays the demo.
 */
export function useDemoAutoplay(root: RefObject<HTMLElement | null>, reducedMotion: boolean, controls: AutoplayControls) {
  const latest = useRef(controls);

  useEffect(() => {
    latest.current = controls;
  });

  useEffect(() => {
    const node = root.current;
    if (reducedMotion || !node || typeof IntersectionObserver === 'undefined') return;
    const { playing, touched } = latest.current;
    let hasStarted = false;
    let isHeld = false;
    let isSeen = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      hasStarted = true;
      isHeld = false;
      latest.current.play();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isSeen = entry.isIntersecting;
        // Taken over, or played through: from here the demo is the visitor's.
        if (touched.current || (hasStarted && !playing.current && !isHeld)) {
          observer.disconnect();
          return;
        }
        if (!isSeen) {
          if (playing.current) {
            isHeld = true;
            latest.current.pause();
          }
          return;
        }
        if (isHeld) {
          start();
          return;
        }
        if (timer !== undefined) return;
        timer = setTimeout(() => {
          if (touched.current) return;
          if (isSeen) start();
          else isHeld = true;
        }, 700);
      },
      { threshold: 0.55 }
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [root, reducedMotion]);
}
