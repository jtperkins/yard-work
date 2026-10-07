import { useEffect, useState, type RefObject } from 'react';

/**
 * Width of an element in CSS px, kept current with ResizeObserver. Falls back to `fallback`
 * where layout is unavailable (jsdom, SSR) so charts still render deterministically.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
