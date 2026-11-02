// Case-study checks (Phase 5: CaseStudyLayout + Circula).
//   npm run dev   (in another terminal)
//   npm run check:case
import { launch } from './_browser.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await launch();
const errors = [];
const external = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  // Third-party embeds (the Figma prototype) log their own errors; only count our own resources.
  page.on('response', (r) => r.status() >= 400 && (new URL(r.url()).hostname === 'localhost' ? errors : external).push(`${r.status()} ${r.url()}`));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(`${page.url()}: ${m.text()}`));
};
const ready = (page, n = 1) => page.waitForFunction((n) => window.__motion?.setups() >= n, n, { timeout: 15000 });
const scrollTo = async (page, selector) => {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), selector);
  await page.waitForTimeout(700);
};

// --------------------------------------------------------------- page
{
  console.log('\nCircula case study (EN)');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(`${BASE}/work/circula/`);
  await ready(page);
  const info = await page.evaluate(() => ({
    label: [...document.querySelectorAll('.case-hero__label span')].map((s) => s.textContent.trim()).join(' '),
    title: document.querySelector('.case-hero__title').textContent.trim(),
    sections: [...document.querySelectorAll('[data-case-section]')].map((s) => s.dataset.title),
    rail: document.querySelectorAll('[data-case-rail] a').length,
    railCurrent: document.querySelectorAll('[data-case-rail] a[aria-current="true"]').length,
    close: getComputedStyle(document.querySelector('[data-nav-close]')).display !== 'none' && getComputedStyle(document.querySelector('.nav__links')).display === 'none',
    closeHref: document.querySelector('[data-nav-close]').getAttribute('href'),
    accent: getComputedStyle(document.body).getPropertyValue('--accent').trim(),
    images: [...document.querySelectorAll('.case img')].filter((i) => !i.closest('.next')).length,
    videos: [...document.querySelectorAll('video')].map((v) => v.getAttribute('src')),
    iframe: document.querySelector('.media iframe')?.getAttribute('src')?.includes('embed.figma.com'),
    bars: [...document.querySelectorAll('[data-bars-value]')].map((b) => b.dataset.barsValue),
    next: document.querySelector('.next__title')?.textContent,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('Hero: "CATEGORY / App/Website design" label and big title', info.label === 'Category / App/Website design' && info.title === 'Circula', info.label);
  check('All eight v1 sections, in order', info.sections.join('|') === 'Challenge|Problem Discovery|User Research & Analysis|What is this app?|Visual Design|UX Experience|Ongoing research|Future Outlook', info.sections.join(' | '));
  check('Reading rail lists every section, none current at the top', info.rail === 8 && info.railCurrent === 0);
  check('Nav shows "Close" back to the stage on this project', info.close && info.closeHref.endsWith('/portfolio/?p=circula'), info.closeHref);
  check('Circula accent applied', info.accent.toLowerCase() === '#f39237', info.accent);
  check('Every v1 image kept (hero, overview, features, screens)', info.images === 4, `${info.images} images`);
  check('Both screen recordings (web MP4) and the Figma prototype', info.videos.length === 2 && info.videos.every((v) => v.endsWith('.mp4')) && info.iframe);
  check('SUS chart: nine means from the v1 data', info.bars.join(' ') === '4.3 1.9 4.2 1.7 1.1 4.4 1.6 4.2 4.5', info.bars.join(' '));
  check('Next project link', info.next === 'Reverie', info.next);
  check('No sideways scroll', info.overflow <= 0);

  // rail follows the reading position
  await scrollTo(page, '#research');
  const current = await page.evaluate(() => document.querySelector('[data-case-rail] a[aria-current="true"]')?.textContent);
  check('Rail marks the section being read', current === '03User Research & Analysis', current);
  await page.click('[data-case-rail] a[href="#future"]');
  await page.waitForTimeout(1600);
  const top = await page.evaluate(() => document.querySelector('#future').getBoundingClientRect().top);
  check('Rail links scroll to their section', top > -10 && top < 200, `${Math.round(top)}px`);

  // progress bar
  const progress = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-case-progress]')).transform).a);
  check('Reading-progress bar fills as you scroll', progress > 0.6 && progress <= 1, progress.toFixed(2));

  // videos play only while centred (v1 behaviour)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const pausedAtTop = await page.evaluate(() => [...document.querySelectorAll('video')].every((v) => v.paused));
  await scrollTo(page, 'video[src$="listview.mp4"]');
  await page.waitForTimeout(800);
  const playing = await page.evaluate(() => {
    const [a, b] = document.querySelectorAll('video');
    return { list: !a.paused, club: !b.paused };
  });
  check('Videos stay paused off-screen and play when centred', pausedAtTop && playing.list && !playing.club, JSON.stringify(playing));

  // chart grows in
  await scrollTo(page, '[data-bars]');
  await page.waitForTimeout(1600);
  const chart = await page.evaluate(() => ({
    in: document.querySelector('[data-bars]').classList.contains('is-in'),
    first: document.querySelector('[data-bars-value]').textContent,
    scale: new DOMMatrix(getComputedStyle(document.querySelector('.bars__fill')).transform).a,
  }));
  check('Chart bars grow and values count up when it scrolls in', chart.in && chart.first === '4.3' && Math.abs(chart.scale - 0.825) < 0.02, `${chart.first}, bar ${chart.scale.toFixed(3)}`);

  // Close → stage, same project (scrolling up brings the nav back)
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(700);
  await page.click('[data-nav-close]');
  await page.waitForURL(/\/portfolio\/$/);
  await ready(page, 2);
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({
    title: document.querySelector('.stage__slide.is-active')?.dataset.title,
    url: location.search,
    splash: document.documentElement.classList.contains('splash-on'),
  }));
  check('Close returns to the stage on Circula (no splash, clean URL)', back.title === 'Circula' && back.url === '' && !back.splash, JSON.stringify(back));
  await page.close();
}

// ------------------------------------------------------------- JA + phone
{
  console.log('\nJapanese, phone, reduced motion, placeholders');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/ja/work/circula/`);
  await ready(page);
  const ja = await page.evaluate(() => ({
    sub: document.querySelector('.case-hero__subtitle').textContent,
    first: document.querySelector('[data-case-section] h3').textContent,
    close: document.querySelector('[data-nav-close]').getAttribute('href'),
    alt: document.querySelector('.case-hero__cover img').alt,
  }));
  check('JA strings from the v1 translations', ja.sub === 'キャンパスでの瞬間を、見逃さない' && ja.first === 'キャンパス情報がバラバラ', `${ja.sub} / ${ja.first}`);
  check('JA Close goes to the JA stage', ja.close.endsWith('/portfolio/ja/?p=circula'));
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  watch(pp);
  await pp.goto(`${BASE}/work/circula/`);
  await ready(pp);
  const m = await pp.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, rail: getComputedStyle(document.querySelector('.case-rail')).display }));
  check('Phone: no sideways scroll, rail hidden', m.overflow <= 0 && m.rail === 'none', JSON.stringify(m));
  await phone.close();

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  await rp.goto(`${BASE}/work/circula/`);
  await ready(rp);
  await rp.evaluate(() => document.querySelector('video').scrollIntoView({ block: 'center' }));
  await rp.waitForTimeout(800);
  const rv = await rp.evaluate(() => ({ paused: document.querySelector('video').paused, controls: document.querySelector('video').controls }));
  check('Reduced motion: videos do not autoplay and show controls', rv.paused && rv.controls);
  await reduced.close();

  const ph = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(ph);
  await ph.goto(`${BASE}/work/reverie/`);
  await ready(ph);
  const p = await ph.evaluate(() => ({ close: document.querySelector('[data-nav-close]').getAttribute('href'), visible: getComputedStyle(document.querySelector('[data-nav-close]')).display }));
  check('Placeholder pages are sheets with Close too', p.visible !== 'none' && p.close.endsWith('?p=reverie'), p.close);
  await ph.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
if (external.length) console.log(`  (third-party responses ignored: ${[...new Set(external.map((e) => e.replace(/\?.*/, '')))].join(', ')})`);
console.log(failures ? `\n${failures} check(s) failed` : '\nAll case checks passed');
process.exit(failures ? 1 : 0);
