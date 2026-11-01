// Language toggle (DESIGN.md §5.8): the choice persists, and switching language
// uses a short 180ms crossfade instead of the normal page transition.
const STORAGE_KEY = 'locale';

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
    if (toggle?.hreflang) rememberLocale(toggle.hreflang);
  });

  // Mark language switches so motion.css can shorten the view transition.
  let switching = false;
  document.addEventListener('astro:before-preparation', (event) => {
    switching = Boolean(event.sourceElement?.closest('[data-lang-toggle]'));
    if (switching) document.documentElement.dataset.vt = 'lang';
    else delete document.documentElement.dataset.vt;
  });
  document.addEventListener('astro:before-swap', (event) => {
    // The swap copies <html> attributes from the new document, so set it there too.
    if (switching) event.newDocument.documentElement.dataset.vt = 'lang';
  });
}
