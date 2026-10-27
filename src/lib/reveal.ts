// Declarative scroll reveals (DESIGN.md §4.3). Markup API:
//
//   <h2 data-reveal="lines">…</h2>          masked line rise (SplitText)
//   <p data-reveal="fade">…</p>             opacity + 16px rise
//   <figure data-reveal="image"><img></figure>   clip-path inset + inner scale
//   <div data-reveal="parallax"><img></div>      scrubbed inner drift, desktop only
//   <span data-reveal="counter">87.5</span>      counts up to the number in the text
//
// Optional: data-reveal-delay="0.2" (seconds), data-reveal-start="top 70%".
// Hidden-before-JS styles live in motion.css (`.js [data-reveal=…]`).
import { gsap, ease, dur, stagger, media } from './motion';
import { beforePage, onPage } from './lifecycle';

type SplitTextClass = typeof import('gsap/SplitText').SplitText;
let SplitText: SplitTextClass | null = null;

// SplitText (~14 KB) is fetched only when the page has line reveals.
beforePage(async () => {
  if (SplitText || !document.querySelector('[data-reveal~="lines"]')) return;
  ({ SplitText } = await import('gsap/SplitText'));
  gsap.registerPlugin(SplitText);
});

type RevealType = 'lines' | 'fade' | 'image' | 'parallax' | 'counter';

const DEFAULT_START = 'top 85%';

function targets(type: RevealType): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>(`[data-reveal~="${type}"]`);
}

function delayOf(el: HTMLElement): number {
  return Number(el.dataset.revealDelay ?? 0) || 0;
}

function trigger(el: HTMLElement): ScrollTrigger.Vars {
  return { trigger: el, start: el.dataset.revealStart ?? DEFAULT_START, once: true };
}

/** The media element an image/parallax wrapper moves. */
function innerMedia(el: HTMLElement): HTMLElement | null {
  return el.querySelector<HTMLElement>('img, video, picture, canvas, [data-reveal-inner]');
}

// ---------------------------------------------------------------- full motion

function linesReveal(el: HTMLElement) {
  if (!SplitText) return;
  let played = false;
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true, // re-splits on resize / font load; the returned tween is reverted with it
    onSplit(self) {
      gsap.set(el, { opacity: 1 });
      if (played) return; // already revealed: don't replay on resize
      return gsap.from(self.lines, {
        yPercent: 110,
        duration: dur.reveal,
        ease: ease.outExpo,
        stagger: stagger.text,
        delay: delayOf(el),
        scrollTrigger: trigger(el),
        onStart: () => {
          played = true;
        },
      });
    },
  });
}

function fadeReveal(el: HTMLElement) {
  gsap.fromTo(
    el,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: ease.outExpo,
      delay: delayOf(el),
      scrollTrigger: trigger(el),
    },
  );
}

function imageReveal(el: HTMLElement) {
  const radius = getComputedStyle(el).getPropertyValue('--radius-md').trim() || '12px';
  const tl = gsap.timeline({ delay: delayOf(el), scrollTrigger: trigger(el) });
  tl.fromTo(
    el,
    { opacity: 1, clipPath: `inset(12% 12% 12% 12% round ${radius})` },
    { clipPath: `inset(0% 0% 0% 0% round ${radius})`, duration: 1.1, ease: ease.outExpo },
  );
  const inner = innerMedia(el);
  if (inner) tl.fromTo(inner, { scale: 1.12 }, { scale: 1, duration: 1.1, ease: ease.outExpo }, 0);
}

function parallax(el: HTMLElement) {
  const inner = innerMedia(el);
  if (!inner) return;
  // Scale up just enough that ±6% drift never shows an edge (DESIGN.md max ±8%).
  gsap.set(inner, { scale: 1.14 });
  gsap.fromTo(
    inner,
    { yPercent: -6 },
    {
      yPercent: 6,
      ease: ease.linear,
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    },
  );
}

interface ParsedNumber {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
  grouped: boolean;
}

function parseNumber(text: string): ParsedNumber | null {
  const match = text.match(/^(\D*?)(-?[\d,]*\.?\d+)(.*)$/s);
  if (!match) return null;
  const [, prefix, raw, suffix] = match;
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return {
    prefix,
    value,
    suffix,
    decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
    grouped: raw.includes(','),
  };
}

function counter(el: HTMLElement) {
  const original = el.textContent ?? '';
  const parsed = parseNumber(original.trim());
  if (!parsed) return;

  const format = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.grouped,
  });

  // Screen readers get the final value once; the ticking digits are hidden from them.
  const visible = document.createElement('span');
  visible.setAttribute('aria-hidden', 'true');
  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = original.trim();
  el.replaceChildren(visible, spoken);

  const state = { value: 0 };
  const render = () => {
    visible.textContent = `${parsed.prefix}${format.format(state.value)}${parsed.suffix}`;
  };
  render();

  gsap.to(state, {
    value: parsed.value,
    duration: 1.2,
    ease: 'power2.out',
    delay: delayOf(el),
    onUpdate: render,
    scrollTrigger: trigger(el),
  });

  return () => {
    el.textContent = original;
  };
}

// -------------------------------------------------------------- reduced motion

/** §4.5: every reveal becomes a 200ms opacity fade; nothing moves. */
function reducedFade(el: HTMLElement) {
  gsap.fromTo(
    el,
    { opacity: 0 },
    { opacity: 1, duration: dur.reducedFade, ease: ease.linear, scrollTrigger: trigger(el) },
  );
}

// ------------------------------------------------------------------- wiring

onPage(({ mm }) => {
  mm.add(media.motion, () => {
    targets('lines').forEach(linesReveal);
    targets('fade').forEach(fadeReveal);
    targets('image').forEach(imageReveal);
    const cleanups = targets('counter').map(counter);
    return () => cleanups.forEach((fn) => fn?.());
  });

  mm.add(`${media.motion} and ${media.desktop}`, () => {
    targets('parallax').forEach(parallax);
  });

  mm.add(media.reduced, () => {
    [...targets('lines'), ...targets('fade'), ...targets('image')].forEach(reducedFade);
    // Counters keep their final value; parallax is off.
  });
});
