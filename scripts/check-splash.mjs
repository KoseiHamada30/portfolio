// Splash checks (DESIGN.md §8.4–8.5).
//   npm run dev   (in another terminal)
//   npm run check:splash
import { launch } from './_browser.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await launch({ splash: true });
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
};

/** Record the splash frame by frame until it's gone. Runs inside the page. */
function recordSplash() {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const samples = [];
    const html = document.documentElement;
    const tick = () => {
      const main = document.querySelector('main');
      const strip = document.querySelector('[data-comp-strip]');
      samples.push({
        t: Math.round(performance.now() - t0),
        on: html.classList.contains('splash-on'),
        count: Number(document.querySelector('[data-comp-count]')?.textContent),
        img: document.querySelector('[data-comp-img].is-active')?.dataset.compImg,
        roll: strip ? new DOMMatrix(getComputedStyle(strip).transform).f : 0,
        mainTop: Math.round(main.getBoundingClientRect().top),
        exiting: html.classList.contains('splash-exit'),
        blank: (() => {
          // a full-screen element at the centre that is neither the splash nor the page = a blank sheet
          const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
          return !!el && !el.closest('[data-splash], main, [data-nav]');
        })(),
        work: document.querySelectorAll('[data-stage-slide]').length,
      });
      const done = !html.classList.contains('splash-on');
      if ((done && samples.length > 5) || performance.now() - t0 > 12000) resolve(samples);
      else setTimeout(tick, 30);
    };
    tick();
  });
}

// ------------------------------------------------------ first visit (EN)
{
  console.log('\nFirst visit');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = Math.max(window.__lcp, entry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`, { waitUntil: 'commit' });
  await page.waitForSelector('[data-splash]', { state: 'attached' });
  const samples = await page.evaluate(recordSplash);

  const counts = samples.map((s) => s.count).filter((n) => !Number.isNaN(n));
  const reached = samples.find((s) => s.count === 100);
  const firstMove = samples.find((s) => s.count > 0);
  const imgs = new Set(samples.filter((s) => s.count < 100).map((s) => s.img));
  const rolled = samples.some((s) => s.roll < -5);
  const sliding = samples.some((s) => s.on && s.exiting && s.mainTop > 50 && s.mainTop < 850);
  const blank = samples.some((s) => s.blank);
  const fill = (reached?.t ?? 0) - (firstMove?.t ?? 0);

  check('Splash shown on first visit', samples[0].on);
  check('Page content is already in the DOM underneath', samples[0].work > 0, `${samples[0].work} stage slides`);
  check('Counter only ever goes up and ends at 100', counts.every((c, i) => i === 0 || c >= counts[i - 1]) && counts.at(-1) === 100, `${counts[0]} → ${counts.at(-1)}`);
  check('Counter fill time within ~1.2–2.4s', fill >= 1100 && fill <= 2700, `${fill}ms`);
  check('Centre image cycles while loading', imgs.size >= 2, [...imgs].join(', '));
  check('Settles on the first project (circula)', samples.filter((s) => s.count === 100).at(-1)?.img === 'circula');
  check('Letter roll plays after 100', rolled);
  check('Home slides up over the splash', sliding);
  check('No blank screen between the splash and Home', !blank);
  const handoff = samples.find((s) => !s.on);
  check('Splash is removed only once Home covers the screen', handoff?.mainTop <= 1, `main top ${handoff?.mainTop}px`);
  const total = samples.at(-1).t;
  check('Whole sequence finishes', !samples.at(-1).on, `${(total / 1000).toFixed(1)}s`);

  await page.waitForFunction(() => window.__motion?.setups() >= 1, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    overflow: getComputedStyle(document.documentElement).overflow,
    lenis: document.documentElement.classList.contains('lenis') && !document.documentElement.classList.contains('lenis-stopped'),
    main: getComputedStyle(document.querySelector('main')).transform,
    title: getComputedStyle(document.querySelector('.stage__slide.is-active .stage__link')).opacity,
    lcp: Math.round(window.__lcp),
  }));
  check('Afterwards: scrolling unlocked, Lenis running, Home in place', after.overflow !== 'hidden' && after.lenis && after.main === 'none', after.main);
  check('Page animations played after the reveal', after.title === '1');
  console.log(`  (LCP in dev: ${after.lcp}ms)`);

  // Refresh plays it again; in-site navigation back to Work doesn't
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('[data-splash]', { state: 'attached' });
  check('Refresh plays the splash again', await page.evaluate(() => document.documentElement.classList.contains('splash-on')));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__motion?.setups() >= 1, null, { timeout: 15000 });
  await page.click('[data-nav-item="info"]');
  await page.waitForURL(/\/info\/$/);
  await page.click('[data-nav-item="work"]');
  await page.waitForURL(/\/portfolio\/$/);
  await page.waitForTimeout(500);
  check('Navigating back to Work: no splash', !(await page.evaluate(() => document.documentElement.classList.contains('splash-on'))));
  // Language switch: in-place swap, and the full-load fallback, both skip the splash
  await page.click('[data-lang-toggle]');
  await page.waitForURL(/\/ja\/$/);
  await page.waitForTimeout(400);
  check('Switching language on Home: no splash', !(await page.evaluate(() => document.documentElement.classList.contains('splash-on'))));
  await page.evaluate(() => {
    sessionStorage.setItem('splash-skip', '1'); // what the toggle sets right before a full-load fallback
    location.href = document.querySelector('[data-lang-toggle]').href;
  });
  await page.waitForURL(/\/portfolio\/$/);
  await page.waitForSelector('[data-splash]', { state: 'attached' });
  check('Language switch that falls back to a full load: no splash', !(await page.evaluate(() => document.documentElement.classList.contains('splash-on'))));
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('[data-splash]', { state: 'attached' });
  check('…and a real refresh afterwards still plays it', await page.evaluate(() => document.documentElement.classList.contains('splash-on')));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__motion?.setups() >= 1, null, { timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem('locale'));
  await page.goto(`${BASE}/info/`);
  await page.waitForFunction(() => window.__motion?.setups() >= 1);
  await page.click('[data-nav-item="work"]');
  await page.waitForURL(/\/portfolio\/$/);
  await page.waitForTimeout(500);
  check('Landing on /info, then clicking Work: no splash', !(await page.evaluate(() => document.documentElement.classList.contains('splash-on'))));
  await ctx.close();
}

// -------------------------------------------------------- wordmark & JA
{
  console.log('\nLayout');
  for (const [width, path] of [[1440, '/'], [375, '/ja/']]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    watch(page);
    await page.goto(`${BASE}${path}`);
    await page.waitForFunction(() => document.querySelector('[data-comp-word]')?.style.getPropertyValue('--word-size'));
    const layout = await page.evaluate(() => {
      const comp = document.querySelector('[data-comp]');
      const word = document.querySelector('[data-comp-word]');
      const pad = parseFloat(getComputedStyle(comp).paddingLeft);
      return {
        word: word.scrollWidth,
        available: comp.clientWidth - pad * 2,
        label: document.querySelector('.comp__label').textContent,
        intro: document.querySelector('.comp__intro').textContent.slice(0, 20),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        media: document.querySelector('[data-comp-media]').getBoundingClientRect().height,
      };
    });
    check(`${width}px ${path}: KOSEI© fills the width`, Math.abs(layout.word - layout.available) / layout.available < 0.03, `${Math.round(layout.word)} / ${Math.round(layout.available)}px`);
    check(`${width}px ${path}: centre image has room`, layout.media > 120, `${Math.round(layout.media)}px tall`);
    check(`${width}px ${path}: no sideways scroll`, layout.overflow <= 0);
    if (path === '/ja/') check('JA: label and intro in Japanese', layout.label === 'プロダクトデザイナー［•］ハマダコウセイ' && layout.intro.startsWith('濵田紘誠'), layout.intro);
    await ctx.close();
  }
}

// --------------------------------------------- skip, reduced motion, no-JS
{
  console.log('\nSkip & fallbacks');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(500);
  const t = Date.now();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.documentElement.classList.contains('splash-on'), null, { timeout: 3000 });
  check('Any key skips it quickly', Date.now() - t < 900, `${Date.now() - t}ms`);
  await page.waitForFunction(() => window.__motion?.setups() >= 1);
  await ctx.close();

  const rctx = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(`${BASE}/`);
  check('Reduced motion: no splash', !(await rp.evaluate(() => document.documentElement.classList.contains('splash-on'))));
  await rctx.close();

  const nctx = await browser.newContext({ javaScriptEnabled: false });
  const np = await nctx.newPage();
  await np.goto(`${BASE}/`);
  const nojs = await np.evaluate(() => getComputedStyle(document.querySelector('[data-splash]')).display);
  check('No JS: splash never shows, page is visible', nojs === 'none' && (await np.locator('[data-stage-slide]').count()) > 0);
  await nctx.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll splash checks passed');
process.exit(failures ? 1 : 0);
