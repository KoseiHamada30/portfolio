// Page lifecycle for Astro ClientRouter (CLAUDE.md "Animation lifecycle rules").
// Bundled scripts run once, so every motion module registers a setup function here.
// On astro:page-load each one runs inside a fresh gsap.context + gsap.matchMedia;
// on astro:before-swap everything is killed with a few calls.
import { gsap, ScrollTrigger } from './motion';
import { initLenis, destroyLenis } from './lenis';

export interface PageScope {
  /** Per-page matchMedia — put reduced-motion / pointer-fine branches in mm.add(). */
  mm: gsap.MatchMedia;
  /** Aborted on astro:before-swap; pass to addEventListener({ signal }). */
  signal: AbortSignal;
}

type PageInit = (scope: PageScope) => void;
type PagePrepare = () => Promise<void> | void;

const inits: PageInit[] = [];
const prepares: PagePrepare[] = [];

let ctx: gsap.Context | null = null;
let mm: gsap.MatchMedia | null = null;
let controller: AbortController | null = null;
let generation = 0;
let completedSetups = 0; // dev diagnostics only

/** Register a setup function that runs on every page load. */
export function onPage(init: PageInit): void {
  inits.push(init);
}

/** Register async work (e.g. lazy-loading a plugin) that must finish before any onPage init runs. */
export function beforePage(prepare: PagePrepare): void {
  prepares.push(prepare);
}

async function setup() {
  const current = ++generation;

  initLenis();

  // SplitText must measure lines with the real fonts, and ScrollTriggers must be
  // created after SplitText, so nothing starts before fonts are ready.
  await Promise.all([document.fonts.ready, ...prepares.map((prepare) => prepare())]);
  if (current !== generation) return; // navigated away while waiting

  controller = new AbortController();
  const signal = controller.signal;

  ctx = gsap.context(() => {
    mm = gsap.matchMedia();
    for (const init of inits) init({ mm, signal });
  });

  ScrollTrigger.refresh();
  refreshAfterMediaLoads(signal);
  completedSetups++;
}

/** Images and videos above pinned or parallax sections change layout when they load. */
function refreshAfterMediaLoads(signal: AbortSignal) {
  let queued = false;
  const queueRefresh = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!signal.aborted) ScrollTrigger.refresh();
    });
  };

  document.querySelectorAll<HTMLImageElement>('main img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', queueRefresh, { once: true, signal });
  });
  document.querySelectorAll<HTMLVideoElement>('main video').forEach((video) => {
    if (video.readyState < 1) video.addEventListener('loadedmetadata', queueRefresh, { once: true, signal });
  });
}

function teardown() {
  generation++;
  controller?.abort();
  controller = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
  mm?.revert(); // also reverts SplitText instances created inside it
  mm = null;
  ctx?.revert();
  ctx = null;
  destroyLenis();
}

let started = false;

export function startLifecycle(): void {
  if (started) return;
  started = true;
  document.addEventListener('astro:page-load', setup);
  document.addEventListener('astro:before-swap', teardown);
  // The swap copies the new page's <html> attributes, dropping the `js` class that
  // gates reveal start states (motion.css); restore it before the new page paints.
  document.addEventListener('astro:after-swap', () => document.documentElement.classList.add('js'));

  if (import.meta.env.DEV) {
    // Dev-only hook for the /lab leak check (ScrollTrigger.getAll().length per page).
    (window as unknown as { __motion: object }).__motion = {
      triggers: () => ScrollTrigger.getAll().length,
      setups: () => completedSetups,
      tweens: () => gsap.globalTimeline.getChildren(true, true, false).length,
    };
  }
}
