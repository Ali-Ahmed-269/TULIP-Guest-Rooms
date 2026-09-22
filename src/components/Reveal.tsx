'use client';

import { useEffect, useRef } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms, applied via CSS custom property */
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
}

/**
 * Fades + lifts its children into view once, when they enter the viewport.
 * Uses IntersectionObserver (no scroll listeners). Motion is defined in CSS
 * under `.reveal` and disabled for prefers-reduced-motion.
 */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
