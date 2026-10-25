// Motion tokens shared by GSAP — mirror of src/styles/tokens.css (DESIGN.md §4.2).
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

export const ease = {
  out: CustomEase.create('ui-out', '0.23, 1, 0.32, 1'),
  outExpo: CustomEase.create('ui-out-expo', '0.16, 1, 0.3, 1'),
  inOut: CustomEase.create('ui-in-out', '0.65, 0, 0.35, 1'),
} as const;

// Seconds (GSAP units).
export const dur = {
  instant: 0.1,
  fast: 0.18,
  base: 0.28,
  slow: 0.5,
  reveal: 0.9,
  page: 1,
} as const;

export const stagger = {
  text: 0.04,
  item: 0.08,
} as const;

export const media = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  okMotion: '(prefers-reduced-motion: no-preference)',
  pointerFine: '(pointer: fine)',
} as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia(media.reducedMotion).matches;
}
