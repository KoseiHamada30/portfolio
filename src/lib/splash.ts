// Splash sequence (DESIGN.md §8.4–8.5):
//   fade in → counter 0→100 from real loading (fonts + first covers, min 1.2s, max 2.4s)
//   while the centre image cycles every 140ms → hold → letter roll (the beat observed on the
//   reference) → page inits run under the splash → Home slides up over it as the image grows.
// Plays on every full load / refresh of the home page; any key or click skips. Runs as a beforePage() hook, so page animations
// start under the splash, before Home slides in.
import { gsap } from './motion';
import { beforePage, onPage } from './lifecycle';
import { getLenis } from './lenis';
import { createComposition } from './splash-composition';

const MIN_MS = 900;
const MAX_MS = 1800;
const CYCLE_MS = 120;
const HOLD_MS = 120;
const IMAGES_TO_WAIT = 4;


function loadTasks(root: HTMLElement): Promise<unknown>[] {
  const images = [...root.querySelectorAll<HTMLImageElement>('img')].slice(0, IMAGES_TO_WAIT);
  return [document.fonts.ready, ...images.map((img) => img.decode().catch(() => undefined))];
}

/** Counter that follows real progress, never goes backwards, and respects the min/max duration. */
function runCounter(tasks: Promise<unknown>[], onUpdate: (value: number) => void, isSkipped: () => boolean): Promise<void> {
  let done = 0;
  tasks.forEach((task) => task.then(() => done++));
  const start = performance.now();
  let shown = 0;

  return new Promise((resolve) => {
    const tick = () => {
      if (isSkipped()) {
        gsap.ticker.remove(tick);
        resolve();
        return;
      }
      const elapsed = performance.now() - start;
      const real = tasks.length ? done / tasks.length : 1;
      // Never ahead of the minimum duration, never later than the maximum.
      const pace = Math.min(1, elapsed / MIN_MS);
      const target = elapsed >= MAX_MS ? 1 : Math.min(real, pace);
      shown = Math.max(shown, shown + (target * 100 - shown) * 0.14);
      if (target === 1 && shown > 99.4) shown = 100;
      onUpdate(shown);
      if (shown >= 100) {
        gsap.ticker.remove(tick);
        resolve();
      }
    };
    gsap.ticker.add(tick);
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const play = (tl: gsap.core.Animation) => new Promise<void>((resolve) => tl.eventCallback('onComplete', () => resolve()));

/** Set when the splash has played through; the onPage hook below then slides Home in over it. */
let exitPending: { comp: ReturnType<typeof createComposition>; finish: () => void } | null = null;

async function runSplash(): Promise<void> {
  const html = document.documentElement;
  const root = document.querySelector<HTMLElement>('[data-splash]');
  const compEl = root?.querySelector<HTMLElement>('[data-comp]');
  if (!root || !compEl) {
    html.classList.remove('splash-on');
    return;
  }

  const lenis = getLenis();
  lenis?.stop();
  window.scrollTo(0, 0);

  const comp = createComposition(compEl);
  let skipped = false;
  const controller = new AbortController();
  const skip = () => (skipped = true);
  window.addEventListener('keydown', skip, { signal: controller.signal });
  window.addEventListener('pointerdown', skip, { signal: controller.signal });
  window.addEventListener('resize', () => comp.fit(), { signal: controller.signal });

  const finish = () => {
    controller.abort();
    html.classList.remove('splash-on', 'splash-exit');
    gsap.set([compEl, comp.media], { clearProps: 'all' });
    lenis?.start();
  };

  await document.fonts.ready; // fit needs the real glyph widths
  comp.fit();
  gsap.fromTo(compEl, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });

  const cycle = setInterval(() => comp.nextImage(), CYCLE_MS);
  await runCounter(loadTasks(root), (value) => comp.setProgress(value), () => skipped);
  clearInterval(cycle);
  comp.setImage(0);

  if (skipped) {
    // Quick way out: fade the overlay.
    await play(gsap.to(root, { opacity: 0, duration: 0.25, ease: 'power2.out' }));
    gsap.set(root, { clearProps: 'opacity' });
    finish();
    return;
  }

  await wait(HOLD_MS);
  await play(comp.roll({ stagger: 0.04, duration: 0.7 }));

  // The splash stays up while the page modules set up underneath; then Home slides in over it.
  exitPending = { comp, finish };
}

/** About → Work (?from=about): the About ending already counted to 100, so Work shows the splash
 *  in that end state and plays only the exit (DESIGN.md §8.4). */
async function exitFromAbout(): Promise<boolean> {
  const params = new URLSearchParams(location.search);
  if (params.get('from') !== 'about') return false;
  params.delete('from');
  const query = params.toString();
  history.replaceState(history.state, '', location.pathname + (query ? `?${query}` : '') + location.hash);

  const html = document.documentElement;
  const root = document.querySelector<HTMLElement>('[data-splash]');
  const compEl = root?.querySelector<HTMLElement>('[data-comp]');
  if (!root || !compEl || matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  html.classList.add('splash-on');
  const lenis = getLenis();
  lenis?.stop();
  window.scrollTo(0, 0);
  const comp = createComposition(compEl);
  await document.fonts.ready;
  comp.fit();
  comp.setImage(0);
  comp.setProgress(100, { scaleImage: true });
  gsap.set(compEl, { opacity: 1 });
  exitPending = {
    comp,
    finish: () => {
      html.classList.remove('splash-on', 'splash-exit');
      gsap.set([compEl, comp.media], { clearProps: 'all' });
      lenis?.start();
    },
  };
  return true;
}

beforePage(async () => {
  if (await exitFromAbout()) return;
  if (!document.documentElement.classList.contains('splash-on')) return;
  await runSplash();
});

// Registered after the page modules (import order in BaseLayout), so the page is set up before it
// moves. Exit (DESIGN.md §8.4, changed 2026-11-02): no blank sheet — the centre image expands to fill
// the screen while Home itself slides up from the bottom over it, then the splash is removed.
onPage(() => {
  if (!exitPending) return;
  const { comp, finish } = exitPending;
  exitPending = null;
  const main = document.querySelector<HTMLElement>('main');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  document.documentElement.classList.add('splash-exit'); // lifts <main> above the splash
  document.dispatchEvent(new CustomEvent('splash:reveal'));

  const exit = gsap.timeline({
    onComplete: () => {
      finish();
      gsap.set(main, { clearProps: 'transform' });
      if (nav) gsap.fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity' });
    },
  });
  // The final picture grows from its frame to fill the whole screen while Home rises over it.
  const media = comp.media;
  const box = media.getBoundingClientRect();
  gsap.set(media, { position: 'fixed', top: box.top, left: box.left, width: box.width, height: box.height, margin: 0, zIndex: 1, scale: 1 });
  exit.to(media, { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, duration: 0.7, ease: 'expo.inOut' }, 0);
  exit.fromTo(main, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, 0.05);
});
