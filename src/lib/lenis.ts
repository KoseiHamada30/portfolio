// Lenis smooth scroll driven by the GSAP ticker (DESIGN.md §4.4).
// Created on every astro:page-load and destroyed on astro:before-swap (see lifecycle.ts).
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

let lenis: Lenis | null = null;

function raf(time: number) {
  lenis?.raf(time * 1000);
}

export function initLenis(): Lenis | null {
  destroyLenis();
  // §4.5: disabled entirely under reduced motion — native scrolling instead.
  if (prefersReducedMotion()) return null;

  lenis = new Lenis({ lerp: 0.1, anchors: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function destroyLenis(): void {
  if (!lenis) return;
  gsap.ticker.remove(raf);
  lenis.destroy();
  lenis = null;
}

export function getLenis(): Lenis | null {
  return lenis;
}
