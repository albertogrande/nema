// SPDX-License-Identifier: Apache-2.0
'use client';

import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';

/**
 * Fades content in on first scroll into view. The hidden state is only applied
 * client-side after hydration — and skipped entirely for elements already in
 * the viewport or under `prefers-reduced-motion` — so nothing is ever hidden
 * without JS and nothing above the fold blinks.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.classList.add('nema-reveal');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('nema-reveal-visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -48px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
