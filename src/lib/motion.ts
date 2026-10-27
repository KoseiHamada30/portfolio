// Motion tokens shared by GSAP — mirror of src/styles/tokens.css (DESIGN.md §4.2).
// Every motion module imports gsap from here so plugins are registered exactly once.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// SplitText is not registered here: reveal.ts loads it only on pages that need it (DESIGN.md §7).
gsap.registerPlugin(CustomEase, ScrollTrigger);

/** Same curves as --ease-* in tokens.css. */
export const ease = {
  out: CustomEase.create('ui-out', '0.23, 1, 0.32, 1'), // --ease-out ≈ power4.out
  outExpo: CustomEase.create('ui-out-expo', '0.16, 1, 0.3, 1'), // --ease-out-expo ≈ expo.out
  inOut: CustomEase.create('ui-in-out', '0.65, 0, 0.35, 1'), // --ease-in-out ≈ power3.inOut
  linear: 'none',
} as const;

/** Seconds — same values as --dur-* in tokens.css. */
export const dur = {
  instant: 0.1,
  fast: 0.18,
  base: 0.28,
  slow: 0.5,
  reveal: 0.9,
  page: 1,
  /** §4.5: every reveal becomes a short opacity fade under reduced motion. */
  reducedFade: 0.2,
} as const;

/** Seconds — same values as --stagger-* in tokens.css. */
export const stagger = {
  text: 0.04,
  item: 0.08,
} as const;

/** Conditions for gsap.matchMedia(). */
export const media = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
  pointerFine: '(pointer: fine)',
  desktop: '(min-width: 1024px)',
} as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia(media.reduced).matches;
}

export { gsap, ScrollTrigger };
