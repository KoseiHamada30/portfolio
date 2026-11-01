// Nav behaviour (DESIGN.md §5.7): hide on scroll down / show on scroll up, blurred backdrop
// after 40px, and a pill indicator that slides between Work¹ and Info².
// The <Nav /> element is persisted, so this runs once and re-syncs on every page load.
import { prefersReducedMotion } from './motion';

const SCROLLED_AT = 40;
const HIDE_AFTER = 120;
const DELTA = 6;

function nav() {
  return document.querySelector<HTMLElement>('[data-nav]');
}

// ------------------------------------------------------------ indicator

function moveIndicator(target: HTMLElement | null) {
  const pill = nav()?.querySelector<HTMLElement>('[data-nav-pill]');
  const indicator = pill?.querySelector<HTMLElement>('[data-nav-indicator]');
  if (!pill || !indicator) return;

  pill.querySelectorAll('[data-nav-item]').forEach((item) => item.classList.toggle('is-lit', item === target));
  if (!target) {
    indicator.style.clipPath = '';
    return;
  }
  const box = indicator.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  const left = item.left - box.left;
  const right = box.right - item.right;
  indicator.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
}

function activeItem(): HTMLElement | null {
  return nav()?.querySelector<HTMLElement>('[data-nav-item][aria-current="page"]') ?? null;
}

// ------------------------------------------------------- per-page sync

/** 'work' | 'info' | null for the current URL. */
function currentSection(): string | null {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = location.pathname.slice(base.length).replace(/^\/+|\/+$/g, '').replace(/^ja(\/|$)/, '');
  if (path.startsWith('info')) return 'info';
  if (path === '' || path.startsWith('work')) return 'work';
  return null;
}

function syncPage() {
  const el = nav();
  if (!el) return;

  // The persisted nav keeps its old DOM, so update what depends on the new page.
  const section = currentSection();
  el.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((item) => {
    if (item.dataset.navItem === section) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  const toggle = el.querySelector<HTMLAnchorElement>('[data-lang-toggle]');
  const alternate = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang]');
  if (toggle) {
    toggle.hidden = !alternate;
    // hreflang links are absolute (production origin); keep the toggle same-origin.
    if (alternate) toggle.setAttribute('href', new URL(alternate.href).pathname);
  }

  el.classList.remove('is-hidden');
  updateScroll(true);
  moveIndicator(activeItem());
}

// -------------------------------------------------------------- scroll

let lastY = 0;
let ticking = false;

function updateScroll(reset = false) {
  ticking = false;
  const el = nav();
  if (!el) return;
  const y = Math.max(window.scrollY, 0);
  el.classList.toggle('is-scrolled', y > SCROLLED_AT);

  if (reset) {
    lastY = y;
    return;
  }
  const delta = y - lastY;
  if (Math.abs(delta) < DELTA) return;
  // §4.5: under reduced motion the nav stays put.
  const hide = delta > 0 && y > HIDE_AFTER && !prefersReducedMotion();
  el.classList.toggle('is-hidden', hide);
  lastY = y;
}

// --------------------------------------------------------------- start

let started = false;

export function startNav(): void {
  if (started) return;
  started = true;

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => updateScroll());
    },
    { passive: true },
  );

  // Hover / focus slides the indicator; leaving returns it to the current page.
  document.addEventListener('pointerover', (event) => {
    const pill = nav()?.querySelector('[data-nav-pill]');
    if (!pill) return;
    const item = (event.target as Element).closest<HTMLElement>('[data-nav-item]');
    if (item && pill.contains(item)) moveIndicator(item);
    else if (!pill.contains(event.target as Node)) moveIndicator(activeItem());
  });
  document.addEventListener('focusin', (event) => {
    const item = (event.target as Element).closest<HTMLElement>('[data-nav-item]');
    moveIndicator(item ?? activeItem());
  });
  window.addEventListener('resize', () => moveIndicator(activeItem()));

  document.addEventListener('astro:page-load', syncPage);
  document.fonts.ready.then(() => moveIndicator(activeItem()));
}
