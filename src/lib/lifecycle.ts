// Page lifecycle for Astro ClientRouter (CLAUDE.md "Animation lifecycle rules").
// Bundled scripts run once, so everything is (re)created on astro:page-load
// and torn down on astro:before-swap.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLenis, destroyLenis } from './lenis';

gsap.registerPlugin(ScrollTrigger);

type PageInit = (ctx: gsap.Context) => void;

const inits: PageInit[] = [];
let ctx: gsap.Context | null = null;

/** Register a setup function that runs inside the page's gsap.context on every page load. */
export function onPage(init: PageInit): void {
  inits.push(init);
}

function setup() {
  initLenis();
  ctx = gsap.context(() => {
    for (const init of inits) init(ctx!);
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

function teardown() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
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
}
