'use client';

import { useEffect, useRef, useState } from 'react';
import TulipIcon from './TulipIcon';
import { INTRO_KEY } from '@/utils/intro';

const WORDS = ['Tulip', 'Guest', 'Rooms'];

// Timeline (ms)
const COUNT_START = 300;
const COUNT_END   = 1800;
const MIN_SHOW    = 1950;   // earliest moment the gold wipe may start
const MAX_WAIT    = 6000;   // never hold the page longer than this
const RELEASE_IN  = 500;    // after the wipe: loader slides up, hero entrance starts
const REMOVE_IN   = 1350;   // after the wipe: unmount

export default function IntroLoader() {
  const rootRef  = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    // Skipped or already released: CSS keeps the loader hidden
    if (html.getAttribute('data-intro') !== 'playing') return;

    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Private mode: intro simply plays again next time
    }

    let cancelled = false;
    const timers: number[] = [];

    // 00 -> 99 counter; the final 100 lands when the page is ready
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start - COUNT_START) / (COUNT_END - COUNT_START)));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      if (countRef.current) countRef.current.textContent = String(Math.round(eased * 99)).padStart(2, '0');
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Leave only after the minimum show AND the page (hero photo included) has loaded
    const minShown = new Promise<void>((resolve) => { timers.push(window.setTimeout(resolve, MIN_SHOW)); });
    const pageLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
    const capped = new Promise<void>((resolve) => { timers.push(window.setTimeout(resolve, MAX_WAIT)); });

    Promise.race([Promise.all([minShown, pageLoaded]), capped]).then(() => {
      if (cancelled) return;
      cancelAnimationFrame(raf);
      if (countRef.current) countRef.current.textContent = '100';
      rootRef.current?.classList.add('is-exit');
      timers.push(
        window.setTimeout(() => {
          rootRef.current?.classList.add('is-leaving');
          html.setAttribute('data-intro', 'done');
        }, RELEASE_IN),
        window.setTimeout(() => setGone(true), REMOVE_IN),
      );
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
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
        <span className="intro-count" ref={countRef}>00</span>
      </div>
    </div>
  );
}
