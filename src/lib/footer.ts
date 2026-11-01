// Footer behaviour: click-to-copy email + toast, live Melbourne clock, auto year.
import { onPage } from './lifecycle';
import { showToast } from './toast';

async function copyEmail(button: HTMLElement) {
  const email = button.dataset.copyEmail;
  if (!email) return;
  try {
    await navigator.clipboard.writeText(email);
    showToast(button.dataset.copiedLabel ?? 'Copied ✓');
  } catch {
    // Clipboard blocked (insecure context, permissions) — fall back to the mail app.
    window.location.href = `mailto:${email}`;
  }
}

function startClock(el: HTMLTimeElement, signal: AbortSignal) {
  const format = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: el.dataset.timezone,
  });
  let timer: ReturnType<typeof setTimeout>;

  const render = () => {
    const now = new Date();
    el.textContent = format.format(now);
    el.dateTime = now.toISOString();
    // Re-render on the next minute boundary.
    timer = setTimeout(render, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
  };
  render();
  signal.addEventListener('abort', () => clearTimeout(timer));
}

onPage(({ signal }) => {
  document.querySelectorAll<HTMLElement>('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', () => copyEmail(button), { signal });
  });
  document.querySelectorAll<HTMLTimeElement>('[data-clock]').forEach((el) => startClock(el, signal));
  const year = String(new Date().getFullYear());
  document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => (el.textContent = year));
});
