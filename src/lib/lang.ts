// Language toggle (DESIGN.md §5.8): the choice persists, and switching language
// uses a short 180ms crossfade instead of the normal page transition.
const STORAGE_KEY = 'locale';
/** Read (and cleared) by the splash's inline script: a language switch never replays the splash. */
const SKIP_SPLASH = 'splash-skip';

export function rememberLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage blocked (private mode etc.) — the toggle still works, it just won't persist
  }
}

let started = false;

export function startLangToggle(): void {
  if (started) return;
  started = true;

  document.addEventListener('click', (event) => {
    const toggle = (event.target as Element | null)?.closest<HTMLAnchorElement>('[data-lang-toggle]');
    if (!toggle?.hreflang) return;
    rememberLocale(toggle.hreflang);
    // If the switch ends up as a full page load (e.g. the router falls back), the other home page
    // must not play the splash again.
    try {
      sessionStorage.setItem(SKIP_SPLASH, '1');
    } catch {
      // storage blocked: nothing to skip with
    }
  });
  // A normal in-place swap never shows the splash, so drop the flag before it can skip a real refresh.
  document.addEventListener('astro:after-swap', () => {
    try {
      sessionStorage.removeItem(SKIP_SPLASH);
    } catch {
      // storage blocked
    }
  });

  // The short crossfade for language switches is marked by transitions.ts (data-vt="lang").
}
