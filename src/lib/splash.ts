// Splash sequence (DESIGN.md §8.4–8.5):
//   fade in → counter 0→100 from real loading (fonts + first covers, min 1.2s, max 2.4s)
//   while the centre image cycles every 140ms → hold → letter roll (the beat observed on the
//   reference) → image scales up as the paper sheet rises → page inits run under the sheet →
//   sheet slides off upward.
// Once per session; any key or click skips. Runs as a beforePage() hook, so page animations
// start only when the sheet is about to reveal them.
import { gsap } from './motion';
import { beforePage, onPage } from './lifecycle';
import { getLenis } from './lenis';
import { createComposition } from './splash-composition';

const MIN_MS = 1200;
const MAX_MS = 2400;
const CYCLE_MS = 140;
const HOLD_MS = 300;
const IMAGES_TO_WAIT = 4;

let sheetPending = false;

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

async function runSplash(): Promise<void> {
  const html = document.documentElement;
  const root = document.querySelector<HTMLElement>('[data-splash]');
  const sheet = document.querySelector<HTMLElement>('[data-splash-sheet]');
  const compEl = root?.querySelector<HTMLElement>('[data-comp]');
  if (!root || !sheet || !compEl) {
    html.classList.remove('splash-on');
    return;
  }

  try {
    sessionStorage.setItem('splash-seen', '1');
  } catch {
    // can't persist — it will show again next load, which is acceptable
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
    html.classList.remove('splash-on');
    gsap.set([compEl, comp.media], { clearProps: 'all' });
    lenis?.start();
  };

  await document.fonts.ready; // fit needs the real glyph widths
  comp.fit();
  gsap.fromTo(compEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });

  const cycle = setInterval(() => comp.nextImage(), CYCLE_MS);
  await runCounter(loadTasks(root), (value) => comp.setProgress(value), () => skipped);
  clearInterval(cycle);
  comp.setImage(0);

  if (skipped) {
    // Quick way out: fade the overlay, no sheet.
    await play(gsap.to(root, { opacity: 0, duration: 0.25, ease: 'power2.out' }));
    gsap.set(root, { clearProps: 'opacity' });
    finish();
    return;
  }

  await wait(HOLD_MS);
  await play(comp.roll());

  // Exit: image grows while the sheet rises over everything.
  sheet.classList.add('is-active');
  const exit = gsap.timeline();
  exit.to(comp.media, { scale: 1.25, duration: 0.6, ease: 'power3.inOut' }, 0);
  exit.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' }, 0);
  await play(exit);

  finish();
  sheetPending = true; // the onPage hook below slides it away once the page is set up
}

beforePage(async () => {
  if (!document.documentElement.classList.contains('splash-on')) return;
  await runSplash();
});

// Registered after the page modules (import order in BaseLayout), so their start states are
// already applied when the sheet moves away.
onPage(() => {
  if (!sheetPending) return;
  sheetPending = false;
  const sheet = document.querySelector<HTMLElement>('[data-splash-sheet]');
  if (!sheet) return;
  // DESIGN.md §8.4: the stage background switch + slider rise-in hook in here (Phase 4R-b).
  document.dispatchEvent(new CustomEvent('splash:reveal'));
  gsap.to(sheet, {
    yPercent: -100,
    duration: 0.7,
    ease: 'expo.inOut',
    onComplete: () => {
      sheet.classList.remove('is-active');
      gsap.set(sheet, { clearProps: 'transform' });
    },
  });
});
