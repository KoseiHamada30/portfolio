// Footer behaviour: click-to-copy email + toast, auto year.
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

onPage(({ signal }) => {
  document.querySelectorAll<HTMLElement>('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', () => copyEmail(button), { signal });
  });
  const year = String(new Date().getFullYear());
  document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => (el.textContent = year));
});
