'use client';

import { cloneElement, useLayoutEffect, useRef, type ReactElement, type Ref } from 'react';

export const WIDGET_RISE_SELECTOR = '.av-callout, .av-qz, .av-flashcard, .av-dd';

export function widgetAlreadyInView(
  rect: { top: number; bottom: number },
  viewportHeight: number,
): boolean {
  return rect.top < viewportHeight * 0.9 && rect.bottom > 0;
}

export function widgetStaggerIndex(indexAmongWidgets: number): number {
  if (indexAmongWidgets <= 0) return 0;
  return Math.min(indexAmongWidgets, 3);
}

export function widgetShouldRise(entries: readonly { isIntersecting: boolean }[]): boolean {
  return entries.some((entry) => entry.isIntersecting);
}

type RiseHostProps = {
  className?: string;
  ref?: Ref<HTMLElement>;
};

/**
 * Client leaf around a quiz / flashcard / drag-drop host. Below-fold
 * widgets get `data-rise-pending` until they enter the viewport, then
 * `data-rise` plays the stagger. First-paint widgets (already in view)
 * stay untouched so SSR / no-JS readers never see a fade-in.
 */
export function WidgetRise({ children }: { children: ReactElement<RiseHostProps> }) {
  const hostRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    if (typeof IntersectionObserver !== 'function') {
      return;
    }

    if (widgetAlreadyInView(el.getBoundingClientRect(), window.innerHeight)) {
      return;
    }

    const root = el.closest('.lesson-surface') ?? el.parentElement;
    const widgets = root ? Array.from(root.querySelectorAll(WIDGET_RISE_SELECTOR)) : [];
    const index = widgets.indexOf(el);
    const stagger = widgetStaggerIndex(index < 0 ? 0 : index);
    if (stagger > 0) el.setAttribute('data-stagger', String(stagger));
    el.setAttribute('data-rise-pending', 'true');

    const io = new IntersectionObserver(
      (entries) => {
        if (widgetShouldRise(entries)) {
          el.removeAttribute('data-rise-pending');
          el.setAttribute('data-rise', 'true');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return cloneElement(children, { ref: hostRef });
}
