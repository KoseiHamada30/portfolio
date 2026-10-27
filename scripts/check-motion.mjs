// Motion-system checks (CLAUDE.md quality checklist). Run against the dev server:
//   npm run dev   (in another terminal)
//   npm run check:motion
// Env: BASE_URL (default http://localhost:4321/portfolio), PW_CHROMIUM (optional browser path).
import { chromium } from 'playwright';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');
const ROUNDS = 5;

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

/** Wait until the lifecycle has finished `count` page setups. */
async function waitForSetup(page, count) {
  await page.waitForFunction((n) => window.__motion?.setups() >= n, count, { timeout: 15000 });
  await page.waitForTimeout(300); // let ScrollTrigger.refresh / once-triggers settle
}

async function snapshot(page) {
  return page.evaluate(() => ({
    path: location.pathname,
    triggers: window.__motion.triggers(),
    tweens: window.__motion.tweens(),
    lines: document.querySelectorAll('[data-reveal~="lines"] [aria-hidden="true"] > *, [data-reveal~="lines"] .line').length,
    marqueeChildren: document.querySelector('[data-marquee]')?.children.length ?? 0,
    lenis: document.documentElement.classList.contains('lenis'),
  }));
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const errors = [];

// ------------------------------------------------------------ 1. leak check
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));

  await page.goto(`${BASE}/lab/`);
  let setups = 1;
  await waitForSetup(page, setups);
  const first = await snapshot(page);
  const lab = [first];
  const guide = [];

  for (let i = 0; i < ROUNDS; i++) {
    await page.click('[data-lab-link="styleguide"]');
    await waitForSetup(page, ++setups);
    guide.push(await snapshot(page));
    await page.click('[data-lab-link="lab"]');
    await waitForSetup(page, ++setups);
    lab.push(await snapshot(page));
  }

  console.log('\n/lab        triggers:', lab.map((s) => s.triggers).join(' → '));
  console.log('/styleguide triggers:', guide.map((s) => s.triggers).join(' → '));
  console.log('/lab        tweens:  ', lab.map((s) => s.tweens).join(' → '));
  console.log('/lab        marquee children:', lab.map((s) => s.marqueeChildren).join(' → '), '\n');

  check('ClientRouter navigations stayed on the same document', lab.every((s) => s.path.endsWith('/lab/')) && guide.every((s) => s.path.endsWith('/styleguide/')));
  check(`/lab ScrollTrigger count is identical over ${ROUNDS} round trips`, lab.every((s) => s.triggers === first.triggers), `${first.triggers}`);
  check(`/styleguide ScrollTrigger count is identical over ${ROUNDS} round trips`, guide.every((s) => s.triggers === guide[0].triggers), `${guide[0].triggers}`);
  check('/lab tween count does not grow', lab.every((s) => s.tweens <= first.tweens), `${first.tweens}`);
  check('Marquee clones are not duplicated', lab.every((s) => s.marqueeChildren === first.marqueeChildren), `${first.marqueeChildren}`);
  check('Lenis is active with full motion', lab.every((s) => s.lenis));

  // Scroll through /lab: every reveal should end fully visible.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(1600);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal~="lines"], [data-reveal~="fade"], [data-reveal~="image"]')]
      .filter((el) => getComputedStyle(el).opacity !== '1')
      .map((el) => el.outerHTML.slice(0, 60)),
  );
  check('All reveals are visible after scrolling through /lab', hidden.length === 0, hidden.join(' | '));
  const counters = await page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal~="counter"] [aria-hidden="true"]')].map((el) => el.textContent),
  );
  check('Counters land on their final values', counters.join(',') === '1,280,72.5%,×3', counters.join(', '));
  await page.close();
}

// ------------------------------------------------------- 2. reduced motion
{
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(`${BASE}/lab/`);
  await waitForSetup(page, 1);

  const state = await page.evaluate(() => ({
    lenis: document.documentElement.classList.contains('lenis'),
    splitLines: document.querySelectorAll('[data-reveal~="lines"] *').length,
    heroText: document.querySelector('[data-reveal~="lines"]')?.textContent?.replace(/\s+/g, ' ').trim(),
    counters: [...document.querySelectorAll('[data-reveal~="counter"]')].map((el) => el.textContent.trim()),
    marqueeChildren: document.querySelector('[data-marquee]')?.children.length,
    marqueeTransform: document.querySelector('[data-marquee-track]')?.style.transform,
    parallaxTransform: getComputedStyle(document.querySelector('[data-reveal~="parallax"] img')).transform,
  }));

  check('Reduced: Lenis is off', !state.lenis);
  check('Reduced: headings are not split into lines', state.splitLines === 1, `${state.splitLines} child element(s) (the <em>)`);
  check('Reduced: counters show final values without counting', state.counters.join(',') === '1,280,72.5%,×3', state.counters.join(', '));
  check('Reduced: marquee is static with no clones', state.marqueeChildren === 1 && !state.marqueeTransform);
  check('Reduced: no parallax transform', state.parallaxTransform === 'none', state.parallaxTransform);

  // A fade below the fold: it should become visible within ~200ms, with no movement.
  const fade = page.locator('[data-reveal="fade"]').first();
  await fade.scrollIntoViewIfNeeded();
  const samples = [];
  for (let i = 0; i < 6; i++) {
    samples.push(await fade.evaluate((el) => ({ o: getComputedStyle(el).opacity, t: getComputedStyle(el).transform })));
    await page.waitForTimeout(60);
  }
  check('Reduced: fade reaches opacity 1 within ~300ms', samples.at(-1).o === '1', samples.map((s) => s.o).join(' → '));
  check('Reduced: fade never moves (no transform)', samples.every((s) => s.t === 'none'), samples.map((s) => s.t).join(' | '));
  await context.close();
}

await browser.close();
check('No page errors or console errors', errors.length === 0, errors.join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll motion checks passed');
process.exit(failures ? 1 : 0);
