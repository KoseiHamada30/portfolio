// Nav behaviour (DESIGN.md §5.7, §8): hide on scroll down / show on scroll up, blurred backdrop
// after 40px, and per-page sync of the active link and language toggle.
// The <Nav /> element is persisted, so this runs once and re-syncs on every page load.
import { prefersReducedMotion } from './motion';
import { pagePath } from './transitions';

const SCROLLED_AT = 40;
const HIDE_AFTER = 120;
const DELTA = 6;

function nav() {
  return document.querySelector<HTMLElement>('[data-nav]');
}

// ------------------------------------------------------- per-page sync

/** 'work' | 'about' | null for the current URL. */
function currentSection(): string | null {
  const path = pagePath(location.pathname);
  if (path.startsWith('about')) return 'about';
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

  placeBar(el);

  // Case sheets: "Close" goes back to the stage on this project (the persisted nav keeps old DOM)
  const close = el.querySelector<HTMLAnchorElement>('[data-nav-close]');
  if (close && document.body.dataset.close) close.setAttribute('href', document.body.dataset.close);

  el.classList.remove('is-hidden');
  updateScroll(true);
}

/** One bar under the current item (or the hovered one); a CSS transition slides it between Work
 *  and About (§8.4). It is the only underline, so hover never shows two lines. */
function placeBar(el: HTMLElement, target?: HTMLElement) {
  const links = el.querySelector<HTMLElement>('.nav__links');
  const bar = el.querySelector<HTMLElement>('[data-nav-bar]');
  if (!links || !bar) return;
  const current = target ?? links.querySelector<HTMLElement>('[data-nav-item][aria-current="page"]');
  // Hidden links (case sheets show "Close") have no box: keep the bar where it was.
  if (!current || links.offsetParent === null) {
    links.classList.toggle('has-bar', Boolean(current));
    return;
  }
  // Underline of the text, not the 44px tap target.
  const range = document.createRange();
  range.selectNodeContents(current);
  const text = range.getBoundingClientRect();
  const box = links.getBoundingClientRect();
  // 0.25em below the text, like text-underline-offset
  const y = text.bottom - box.top + parseFloat(getComputedStyle(current).fontSize) * 0.25 - 2;
  bar.style.transform = `translate(${text.left - box.left}px, ${y}px) scaleX(${text.width})`;
  links.classList.add('has-bar');
  // Animate moves only after the first placement, so the bar doesn't fly in on load.
  if (!links.classList.contains('bar-ready')) requestAnimationFrame(() => links.classList.add('bar-ready'));
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

  document.addEventListener('astro:page-load', syncPage);
  // Also right after the swap, so the bar slides while the page transition runs.
  document.addEventListener('astro:after-swap', syncPage);
  // Text metrics change once the webfont arrives and when the window resizes.
  const replace = () => {
    const el = nav();
    if (el) placeBar(el);
  };
  document.fonts?.ready.then(replace);
  window.addEventListener('resize', replace, { passive: true });

  // Hover (and keyboard focus) moves the bar to that item; leaving puts it back on the current page.
  const show = (event: Event) => {
    const item = (event.target as Element | null)?.closest<HTMLElement>('[data-nav] [data-nav-item]');
    const el = nav();
    if (item && el) placeBar(el, item);
  };
  const back = (event: Event) => {
    const el = nav();
    const to = (event as FocusEvent | PointerEvent).relatedTarget as Node | null;
    if (el && !el.querySelector('.nav__links')?.contains(to)) placeBar(el);
  };
  document.addEventListener('pointerover', show);
  document.addEventListener('focusin', show);
  document.addEventListener('pointerout', (e) => (e.target as Element | null)?.closest?.('[data-nav] .nav__links') && back(e));
  document.addEventListener('focusout', (e) => (e.target as Element | null)?.closest?.('[data-nav] .nav__links') && back(e));
}
