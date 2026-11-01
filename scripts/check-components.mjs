// Global component checks: Nav, Footer, Toast, Cursor, language toggle.
//   npm run dev   (in another terminal)
//   npm run check:components
// Env: BASE_URL (default http://localhost:4321/portfolio), PW_CHROMIUM (optional browser path).
import { launch } from './_browser.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');
const EMAIL = 'koseidama35@gmail.com';

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function ready(page, count = 1) {
  await page.waitForFunction((n) => window.__motion?.setups() >= n, count, { timeout: 15000 });
  await page.waitForTimeout(250);
}

const browser = await launch();
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
};

// ------------------------------------------------------------------ Nav
{
  console.log('\nNav');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/lab/`);
  await ready(page);
  const nav = page.locator('[data-nav]');

  check('No backdrop at the top', !(await nav.evaluate((el) => el.classList.contains('is-scrolled'))));
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  const down = await nav.evaluate((el) => ({ hidden: el.classList.contains('is-hidden'), scrolled: el.classList.contains('is-scrolled'), y: el.getBoundingClientRect().bottom }));
  check('Scrolling down hides the nav', down.hidden && down.y <= 1, `bottom ${Math.round(down.y)}px`);
  check('Backdrop on after 40px', down.scrolled);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(700);
  const up = await nav.evaluate((el) => ({ hidden: el.classList.contains('is-hidden'), top: el.getBoundingClientRect().top }));
  check('Scrolling up shows it again', !up.hidden && up.top === 0);

  // Pill indicator + persistence across a ClientRouter navigation
  await page.goto(`${BASE}/`);
  await ready(page);
  await page.evaluate(() => (document.querySelector('[data-nav]').__persisted = true));
  const clipWork = await page.locator('[data-nav-indicator]').evaluate((el) => el.style.clipPath);
  check('Work¹ is current on /', (await page.locator('[data-nav-item="work"]').getAttribute('aria-current')) === 'page');
  await page.mouse.move(0, 400);
  await page.click('[data-nav-item="info"]');
  await ready(page, 2);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    path: location.pathname,
    persisted: document.querySelector('[data-nav]').__persisted === true,
    info: document.querySelector('[data-nav-item="info"]').getAttribute('aria-current'),
    work: document.querySelector('[data-nav-item="work"]').getAttribute('aria-current'),
    clip: document.querySelector('[data-nav-indicator]').style.clipPath,
  }));
  check('Nav element persisted across navigation', after.persisted && after.path.endsWith('/info/'));
  check('Info² becomes current', after.info === 'page' && after.work === null);
  check('Indicator moved', after.clip !== clipWork && after.clip.startsWith('inset('), `${clipWork} → ${after.clip}`);
  await page.close();
}

// --------------------------------------------------------- Language toggle
{
  console.log('\nLanguage toggle');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${BASE}/info/`);
  await ready(page);
  const vt = page.evaluate(
    () => new Promise((resolve) => document.addEventListener('astro:before-swap', () => resolve(document.documentElement.dataset.vt ?? null), { once: true })),
  );
  await page.click('[data-lang-toggle]');
  await ready(page, 2);
  const ja = await page.evaluate(() => ({
    path: location.pathname,
    lang: document.documentElement.lang,
    stored: localStorage.getItem('locale'),
    toggle: document.querySelector('[data-lang-toggle]').getAttribute('href'),
    label: document.querySelector('[data-lang-toggle]').textContent.trim(),
    footer: document.querySelector('#contact .link-bullet__label:not(.footer__email *)')?.textContent,
  }));
  check('EN /info → JA /ja/info/', ja.path.endsWith('/ja/info/') && ja.lang === 'ja', ja.path);
  check('180ms crossfade flag set for the swap', (await vt) === 'lang');
  check('Choice stored', ja.stored === 'ja');
  check('Toggle now points back to the English page', ja.toggle.endsWith('/portfolio/info/') && ja.label === 'EN', `${ja.toggle} (${ja.label})`);
  const resume = await page.locator('#contact a[href*="drive.google"] .link-bullet__label').textContent();
  check('Footer is in Japanese', resume === 'レジュメを見る', resume);
  await context.close();

  // Returning visitor who chose Japanese, landing on the English home page
  const returning = await browser.newContext();
  await returning.addInitScript(() => localStorage.setItem('locale', 'ja'));
  const rp = await returning.newPage();
  await rp.goto(`${BASE}/`);
  await rp.waitForURL(/\/ja\/$/, { timeout: 5000 }).catch(() => {});
  check('Returning visitor (locale=ja) lands on /ja/', rp.url().endsWith('/ja/'), rp.url());
  await returning.close();
}

// ---------------------------------------------------------------- Footer
{
  console.log('\nFooter');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);

  const clock = await page.locator('[data-clock]').textContent();
  const expected = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Melbourne' }).format(new Date());
  check('Melbourne clock shows the current time', clock === expected, `MEL ${clock} (expected ${expected})`);
  check('Year is current', (await page.locator('[data-year]').textContent()) === String(new Date().getFullYear()));

  const links = await page.evaluate(() => [...document.querySelectorAll('#contact a')].map((a) => a.getAttribute('href')));
  check('Resume, TikTok, LinkedIn and mailto links present', ['drive.google.com/file/d/1CrWoSxvAn8ABei2tWH5UEiZowBDO4jnX', 'tiktok.com/@kosei_beproductiv', 'linkedin.com/in/kosei-hamada', `mailto:${EMAIL}`].every((needle) => links.some((href) => href?.includes(needle))));

  await page.locator('[data-copy-email]').scrollIntoViewIfNeeded();
  await page.click('[data-copy-email]');
  await page.waitForTimeout(350);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const toast = await page.locator('[data-toast]').evaluate((el) => ({ text: el.textContent, visible: el.classList.contains('is-visible'), role: el.getAttribute('role') }));
  check('Clicking the email copies it', copied === EMAIL, copied);
  check('Toast says "Copied ✓" and is announced', toast.visible && toast.text === 'Copied ✓' && toast.role === 'status', toast.text);
  await page.waitForTimeout(1700);
  check('Toast hides after ~1.6s', !(await page.locator('[data-toast]').evaluate((el) => el.classList.contains('is-visible'))));

  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.matches('[data-copy-email]'));
  check('Copy button is keyboard-focusable', focused);
  await context.close();
}

// ---------------------------------------------------------------- Cursor
{
  console.log('\nCursor');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/lab/`);
  await ready(page);
  check('Custom cursor on (pointer-fine, full motion)', await page.evaluate(() => document.documentElement.classList.contains('has-cursor')));
  const target = page.locator('[data-reveal="image"]');
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await page.waitForTimeout(400);
  const state = await page.locator('[data-cursor-root]').evaluate((el) => ({ label: el.classList.contains('is-label'), text: el.querySelector('[data-cursor-label]').textContent, visible: el.classList.contains('is-visible') }));
  check('Hovering data-cursor="view" shows the "View" pill', state.visible && state.label && state.text === 'View', state.text);
  await page.mouse.move(5, 5, { steps: 4 });
  await page.waitForTimeout(300);
  check('Pill collapses back to the dot elsewhere', !(await page.locator('[data-cursor-root]').evaluate((el) => el.classList.contains('is-label'))));
  await page.close();

  for (const [name, options] of [
    ['touch phone', { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }],
    ['reduced motion', { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }],
  ]) {
    const ctx = await browser.newContext(options);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/lab/`);
    await ready(p);
    const on = await p.evaluate(() => document.documentElement.classList.contains('has-cursor'));
    check(`No custom cursor on ${name}`, !on);
    await ctx.close();
  }
}

// ------------------------------------------------- Reduced motion + mobile
{
  console.log('\nReduced motion & mobile');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lab/`);
  await ready(page);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  check('Reduced: nav does not hide on scroll', !(await page.locator('[data-nav]').evaluate((el) => el.classList.contains('is-hidden'))));
  await ctx.close();

  for (const width of [375, 768, 1280, 1920]) {
    const c = await browser.newContext({ viewport: { width, height: 800 } });
    const p = await c.newPage();
    for (const path of ['/', '/ja/', '/lab/']) {
      await p.goto(`${BASE}${path}`);
      await ready(p);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) check(`No horizontal scroll at ${width}px on ${path}`, false, `${overflow}px`);
    }
    check(`No horizontal scroll at ${width}px (/, /ja/, /lab/)`, true);
    await c.close();
  }

  // Keyboard: skip link first, nav reachable, focused nav never hidden
  const k = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await k.goto(`${BASE}/`);
  await ready(k);
  await k.keyboard.press('Tab');
  const first = await k.evaluate(() => ({ cls: document.activeElement?.className, top: document.activeElement?.getBoundingClientRect().top }));
  check('First Tab focuses the visible skip link', String(first.cls).includes('skip-link') && first.top >= 0);
  const order = [];
  for (let i = 0; i < 5; i++) {
    await k.keyboard.press('Tab');
    order.push(await k.evaluate(() => document.activeElement?.dataset.navItem ?? (document.activeElement?.hasAttribute('data-lang-toggle') ? 'lang' : document.activeElement?.textContent?.trim().slice(0, 12))));
  }
  const normalised = order.map((s) => String(s).replace(/\s+/g, ''));
  check('Tab order: brand → Work → Info → language → Contact', normalised.join(',') === 'KoseiHamada,work,info,lang,•Contact', order.join(' → '));
  await k.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll component checks passed');
process.exit(failures ? 1 : 0);
