// showToast('Copied ✓') — uses the persistent <Toast /> element in BaseLayout.
const DEFAULT_MS = 1600;

let hideTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, ms = DEFAULT_MS): void {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;

  clearTimeout(hideTimer);
  clearTimeout(clearTimer);
  el.textContent = message;
  // Force a style flush so re-showing the same message still animates in.
  el.classList.remove('is-visible');
  void el.offsetWidth;
  el.classList.add('is-visible');

  hideTimer = setTimeout(() => {
    el.classList.remove('is-visible');
    clearTimer = setTimeout(() => (el.textContent = ''), 300);
  }, ms);
}
