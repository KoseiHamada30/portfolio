// Page transition checks (Phase 10, DESIGN.md §8.4 "Stage & Sheet").
//   npm run dev   (in another terminal)
//   npm run check:transitions
import { launch } from './_browser.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await launch();
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
};
const ready = (page, n = 1) => page.waitForFunction((n) => window.__motion?.setups() >= n, n, { timeout: 15000 });
const setups = (page) => page.evaluate(() => window.__motion.setups());

/** Home without the splash (a language-switch flag the splash honours once). */
async function home(page, path = '/') {
  await page.addInitScript(() => sessionStorage.setItem('splash-skip', '1'));
  await page.goto(`${BASE}${path}`);
  await ready(page);
  await page.waitForTimeout(1200);
}

/** Records the view-transition animations (pseudo element, keyframes name, duration) of the next navigation. */
const record = (page) =>
  page.evaluate(() => {
    window.__vt = new Map();
    const tick = () => {
      for (const a of document.getAnimations()) {
        const pseudo = a.effect?.pseudoElement;
        // skip the browser's own group animation (size/position morph; nothing moves here)
        if (!pseudo?.startsWith('::view-transition') || a.animationName?.startsWith('-ua-')) continue;
        window.__vt.set(`${pseudo} ${a.animationName}`, Math.round(a.effect.getTiming().duration));
      }
      if (window.__vtOn) requestAnimationFrame(tick);
    };
    window.__vtOn = true;
    requestAnimationFrame(tick);
  });
const recorded = (page) =>
  page.evaluate(() => {
    window.__vtOn = false;
    return { kind: document.documentElement.dataset.vt ?? null, anims: Object.fromEntries(window.__vt) };
  });
const has = (anims, pseudo, name, ms) => anims[`::view-transition-${pseudo}(root) ${name}`] === ms;
const after = (page, pattern) => page.waitForURL(pattern).then(() => ready(page)).then(() => page.waitForTimeout(1100));

// ------------------------------------------------------------ sheets
{
  console.log('\nWork ↔ case study');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await home(page);

  // open Circula (second slide)
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  await record(page);
  await page.click('[data-stage-slide].is-active [data-stage-link]');
  await after(page, /\/work\/circula\/$/);
  let vt = await recorded(page);
  check('Open: the sheet rises (900ms) over the dimming slider', vt.kind === 'open' && has(vt.anims, 'new', 'vt-rise', 900) && has(vt.anims, 'old', 'vt-dim', 900), JSON.stringify(vt));
  check('The nav has its own layer (does not ride the sheet)', await page.evaluate(() => getComputedStyle(document.querySelector('[data-nav]')).viewTransitionName === 'nav'));
  check('Case page starts at the top', (await page.evaluate(() => scrollY)) < 5);

  // Close
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await record(page);
  await page.click('[data-nav-home]');
  await after(page, /\/portfolio\/$/);
  vt = await recorded(page);
  const active = await page.evaluate(() => document.querySelector('[data-stage-slide].is-active')?.dataset.id);
  check('Close: the sheet slides down (650ms), the slider brightens back', vt.kind === 'close' && has(vt.anims, 'old', 'vt-sink', 650) && has(vt.anims, 'new', 'vt-undim', 650), JSON.stringify(vt));
  check('…and the slider is on the same project', active === 'circula', active);
  check('No slider entrance animation under a closing sheet', await page.evaluate(() => getComputedStyle(document.querySelector('[data-stage-slide].is-active .stage__link')).opacity === '1'));

  // Back (→ case, an "open"), then Next project
  await page.goBack();
  await after(page, /\/work\/circula\/$/);
  await record(page);
  await page.click('.next__link');
  await after(page, /\/work\/(?!circula)[^/]+\/$/);
  vt = await recorded(page);
  check('Next project: the current sheet lifts away, the next rises', vt.kind === 'next' && has(vt.anims, 'old', 'vt-lift', 900) && has(vt.anims, 'new', 'vt-rise', 900), JSON.stringify(vt));

  await record(page);
  await page.goBack();
  await after(page, /\/work\/circula\/$/);
  vt = await recorded(page);
  check('Back from it: the reverse (sheet sinks, previous comes down)', vt.kind === 'prev' && has(vt.anims, 'old', 'vt-sink', 900) && has(vt.anims, 'new', 'vt-drop', 900), JSON.stringify(vt));

  // Back to Work restores the slider and scroll
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await record(page);
  await page.goBack(); // circula → (the earlier) Work
  await after(page, /\/portfolio\/(\?p=circula)?$/);
  vt = await recorded(page);
  const back = await page.evaluate(() => document.querySelector('[data-stage-slide].is-active')?.dataset.id);
  check('Browser Back to Work: close, same slide', vt.kind === 'close' && back === 'circula', `${vt.kind} ${back}`);

  // ---------------------------------------------------------- Work ↔ About
  console.log('\nWork ↔ About');
  await record(page);
  await page.click('[data-nav-item="about"]');
  await after(page, /\/about\/$/);
  vt = await recorded(page);
  const barOk = await page.evaluate(() => {
    const bar = document.querySelector('[data-nav-bar]');
    const r = document.createRange();
    r.selectNodeContents(document.querySelector('[data-nav-item="about"]'));
    const text = r.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    return getComputedStyle(bar).opacity === '1' && Math.abs(b.left - text.left) < 2;
  });
  check('Section: Work fades out (300ms), then About fades in (360ms) — stage ↔ paper, no overlap', vt.kind === 'section' && has(vt.anims, 'old', 'vt-fade-out', 300) && has(vt.anims, 'new', 'vt-fade-in', 360), JSON.stringify(vt));
  check('The nav bar sits under About', barOk);
  check('Bar is animated (CSS transition on transform)', await page.evaluate(() => getComputedStyle(document.querySelector('[data-nav-bar]')).transitionProperty.includes('transform')));

  // ---------------------------------------------------------- leaks
  console.log('\nRapid back/forward');
  // history now: … Work, About. Build a few more entries, then hammer back/forward.
  await page.click('[data-nav-home]');
  await after(page, /\/portfolio\/$/);
  const baseTriggers = await page.evaluate(() => window.__motion.triggers());
  const before = await setups(page);
  for (let i = 0; i < 10; i++) {
    await (i % 2 ? page.goForward() : page.goBack()).catch(() => {});
    await page.waitForTimeout(120);
  }
  // 10 moves from Work end on Work again (even count)
  await page.waitForURL(/\/portfolio\/$/);
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => ({
    triggers: window.__motion.triggers(),
    stages: document.querySelectorAll('[data-stage]').length,
    lenses: document.querySelectorAll('.stage__lens').length,
    slides: document.querySelectorAll('[data-stage-slide]').length,
    vt: document.documentElement.dataset.vt,
  }));
  check('10 rapid back/forward: no leaked triggers, one stage, one lens per slide', m.triggers === baseTriggers && m.stages === 1 && m.lenses === m.slides, `${JSON.stringify(m)} (fresh: ${baseTriggers} triggers, ${(await setups(page)) - before} setups)`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  check('The slider still works afterwards', (await page.evaluate(() => document.querySelector('[data-stage-slide].is-active')?.dataset.id)) !== 'nba-research-lab');
  await page.close();
}

// ------------------------------------------------- language, reduced motion, About hand-off
{
  console.log('\nLanguage, About hand-off, reduced motion');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await home(page, '/work/circula/');
  await record(page);
  await page.click('[data-lang-toggle]');
  await after(page, /\/ja\/work\/circula\/$/);
  let vt = await recorded(page);
  check('Language switch: a short crossfade, no sheet', vt.kind === 'lang' && !Object.keys(vt.anims).some((k) => k.includes('vt-rise')) && Object.values(vt.anims).every((ms) => ms <= 180), JSON.stringify(vt));

  await page.goto(`${BASE}/about/`);
  await ready(page);
  await record(page);
  await page.evaluate(() => {
    const end = document.querySelector('[data-about-end]');
    window.scrollTo(0, end.offsetTop + end.offsetHeight);
  });
  await page.waitForURL(/\/portfolio\/$/, { timeout: 5000 });
  vt = await recorded(page);
  check('About → Work hand-off: no page transition (the splash exit covers it)', vt.kind === 'cut' && Object.keys(vt.anims).every((k) => !k.includes('(root)')), JSON.stringify(vt));
  await page.waitForTimeout(2000);
  await page.close();

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  watch(rp);
  await home(rp);
  await record(rp);
  await rp.click('[data-stage-slide].is-active [data-stage-link]');
  await after(rp, /\/work\/nba-research-lab\/$/);
  vt = await recorded(rp);
  const roots = Object.entries(vt.anims).filter(([k]) => k.includes('(root)'));
  check('Reduced motion: a 150ms crossfade instead of the sheet', roots.length > 0 && roots.every(([k, ms]) => ms === 150 && !k.includes('vt-rise')), JSON.stringify(vt));
  await reduced.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll transition checks passed');
process.exit(failures ? 1 : 0);
