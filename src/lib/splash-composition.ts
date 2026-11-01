// Controller for <SplashComposition />: fit the wordmark, set progress, swap the centre image,
// play the letter roll. Shared by the splash (loading progress) and, later, the About ending
// (scroll progress), per DESIGN.md §8.4.
import { gsap } from './motion';

export interface Composition {
  root: HTMLElement;
  media: HTMLElement;
  /** Size the wordmark so it spans the full width inside the page margins. */
  fit(): void;
  /** 0–100. With `scaleImage`, also grows the centre image .5 → 1.4 (About → Work scrub). */
  setProgress(progress: number, options?: { scaleImage?: boolean }): void;
  setImage(index: number): void;
  nextImage(): void;
  imageCount: number;
  /** Letter roll: each strip scrolls through its glyph copies, as a wave (DESIGN.md §8.4). */
  roll(vars?: { stagger?: number; duration?: number }): gsap.core.Timeline;
}

export function createComposition(root: HTMLElement): Composition {
  const word = root.querySelector<HTMLElement>('[data-comp-word]')!;
  const media = root.querySelector<HTMLElement>('[data-comp-media]')!;
  const count = root.querySelector<HTMLElement>('[data-comp-count]')!;
  const strips = [...root.querySelectorAll<HTMLElement>('[data-comp-strip]')];
  const images = [...root.querySelectorAll<HTMLElement>('[data-comp-img]')];
  let current = 0;

  const fit = () => {
    word.style.removeProperty('--word-size');
    const available = root.clientWidth - parseFloat(getComputedStyle(root).paddingLeft) * 2;
    const size = parseFloat(getComputedStyle(word).fontSize);
    const width = word.scrollWidth;
    if (width > 0) word.style.setProperty('--word-size', `${(size * available) / width}px`);
  };

  const setImage = (index: number) => {
    if (!images.length) return;
    current = ((index % images.length) + images.length) % images.length;
    images.forEach((img, i) => img.classList.toggle('is-active', i === current));
  };

  return {
    root,
    media,
    fit,
    imageCount: images.length,
    setProgress(progress, options) {
      const value = gsap.utils.clamp(0, 100, progress);
      count.textContent = String(Math.round(value));
      if (options?.scaleImage) gsap.set(media, { scale: gsap.utils.interpolate(0.5, 1.4, value / 100) });
    },
    setImage,
    nextImage: () => setImage(current + 1),
    roll({ stagger = 0.05, duration = 0.9 } = {}) {
      const copies = strips[0]?.children.length ?? 1;
      const tl = gsap.timeline();
      // Right-to-left wave, as observed on the reference; the last copy matches the first,
      // so resetting to 0 afterwards is invisible.
      tl.fromTo(
        strips,
        { yPercent: 0 },
        { yPercent: (-100 * (copies - 1)) / copies, duration, ease: 'expo.out', stagger: { each: stagger, from: 'end' } },
      );
      tl.set(strips, { yPercent: 0 });
      return tl;
    },
  };
}
