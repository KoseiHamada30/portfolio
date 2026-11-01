// Nav behaviour (DESIGN.md §5.7, §8): hide on scroll down / show on scroll up, blurred backdrop
// after 40px, and per-page sync of the active link, language toggle and Contact target.
// The <Nav /> element is persisted, so this runs once and re-syncs on every page load.
import { prefersReducedMotion } from './motion';

const SCROLLED_AT = 40;
const HIDE_AFTER = 120;
const DELTA = 6;

function nav() {
  return document.querySelector<HTMLElement>('[data-nav]');
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

  // Contact scrolls to this page's footer, or goes to the page that has one (the Work stage has none).
  const contact = el.querySelector<HTMLAnchorElement>('[data-nav-contact]');
  if (contact) contact.setAttribute('href', document.getElementById('contact') ? '#contact' : (contact.dataset.fallback ?? '#contact'));

  el.classList.remove('is-hidden');
  updateScroll(true);
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
}
