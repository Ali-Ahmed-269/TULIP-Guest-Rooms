'use client';

import { useEffect, useRef, useState } from 'react';
import TulipIcon from './TulipIcon';
import { INTRO_KEY } from '@/utils/intro';

const WORDS = ['Tulip', 'Guest', 'Rooms'];

// Timeline (ms)
const COUNT_START = 300;
const COUNT_END   = 1800;
const MIN_SHOW    = 2000;   // earliest moment the gold wipe may start
const MAX_WAIT    = 6000;   // never hold the page longer than this
const RELEASE_IN  = 500;    // after the wipe: loader slides up, hero entrance starts
const REMOVE_IN   = 1350;   // after the wipe: unmount

export default function IntroLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute('data-intro') !== 'playing') return;

    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Private mode — intro plays again next session
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ── Counter animation: 00 → 99, then 100 on finish ──────────────────────
    const updateCount = (valStr: string) => {
      if (countRef.current) {
        countRef.current.textContent = valStr;
      } else {
        const el = document.getElementById('intro-count-el');
        if (el) el.textContent = valStr;
      }
    };

    let rafId = 0;
    const counterStart = performance.now();
    const DURATION = 1700;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - counterStart;
      const t = Math.min(1, Math.max(0, elapsed / DURATION));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const val = Math.round(eased * 99);
      updateCount(String(val).padStart(2, '0'));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    // ── Exit trigger ─────────────────────────────────────────────────────────
    const minShown  = new Promise<void>((res) => { timers.push(setTimeout(res, MIN_SHOW)); });
    const pageReady = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((res) => window.addEventListener('load', () => res(), { once: true }));
    const capped    = new Promise<void>((res) => { timers.push(setTimeout(res, MAX_WAIT)); });

    Promise.race([Promise.all([minShown, pageReady]), capped]).then(() => {
      if (cancelled) return;
      cancelAnimationFrame(rafId);

      // Show 100 on finish
      updateCount('100');

      // Gold wipe in → slide up → unmount
      rootRef.current?.classList.add('is-exit');
      timers.push(
        setTimeout(() => {
          rootRef.current?.classList.add('is-leaving');
          html.setAttribute('data-intro', 'done');
        }, RELEASE_IN),
        setTimeout(() => {
          if (!cancelled) setGone(true);
        }, REMOVE_IN),
      );
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (gone) return null;

  let letterIndex = 0;

  return (
    <div className="intro" ref={rootRef} aria-hidden="true">
      <div className="intro-panel" />

      <div className="intro-center">
        <span className="intro-mark">
          <TulipIcon size={40} />
        </span>
        <p className="intro-word">
          {WORDS.map((word, w) => (
            <span key={word} className={`intro-w ${w === 0 ? 'intro-w--accent' : ''}`}>
              {word.split('').map((ch) => {
                const i = letterIndex++;
                return (
                  <span key={i} className="intro-l" style={{ '--i': i } as React.CSSProperties}>
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      </div>

      <div className="intro-meta">
        <span className="intro-tag">Guest rooms in Abbottabad</span>
        <span className="intro-count" id="intro-count-el" ref={countRef}>00</span>
      </div>
    </div>
  );
}
