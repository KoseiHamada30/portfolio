// About page checks (Phase 9: About → Work).
//   npm run dev   (in another terminal)
//   npm run check:about
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
const endProgress = (page) => page.evaluate(() => Number(document.querySelector('[data-about-end] [data-comp-count]').textContent));
const scrollEnd = (page, fraction) =>
  page.evaluate((f) => {
    const end = document.querySelector('[data-about-end]');
    window.scrollTo(0, end.offsetTop + (end.offsetHeight - innerHeight) * f);
  }, fraction);

// --------------------------------------------------------------- page
{
  console.log('\nAbout');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  const res = await page.goto(`${BASE}/info/`);
  await page.waitForURL(/\/about\/?$/);
  await ready(page);
  check('/info redirects to /about', page.url().endsWith('/portfolio/about/'), `${res.status()} → ${page.url()}`);

  const info = await page.evaluate(() => ({
    name: document.querySelector('.about__name').textContent,
    lead: document.querySelector('.about__lead').textContent.slice(0, 22),
    contact: [...document.querySelectorAll('.about__contact dt')].map((d) => d.textContent),
    links: [...document.querySelectorAll('.about__contact a')].map((a) => a.getAttribute('href')),
    headings: [...document.querySelectorAll('.about__h')].map((h) => h.textContent),
    experience: [...document.querySelectorAll('#about-experience + dl .about__row')].map((r) => r.querySelector('.about__item-title').textContent),
    rows: document.querySelectorAll('.about__row[data-reveal="fade"]').length,
    photos: document.querySelectorAll('.about__photos img').length,
    portraitSticky: getComputedStyle(document.querySelector('.about__portrait')).position,
    navCurrent: document.querySelector('[data-nav-item="about"]').getAttribute('aria-current'),
    footer: !!document.querySelector('footer'),
    cta: document.querySelector('[data-comp-cta]')?.textContent.trim(),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('Name label and the v1 greeting as the statement', info.name === 'K.H.' && info.lead.startsWith("Hello, I'm Kosei"), info.lead);
  check('EMAIL / LINKEDIN / RESUME rows', info.contact.join('|') === 'Email|LinkedIn|Resume' && info.links[0] === 'mailto:koseidama35@gmail.com' && info.links[1].includes('linkedin') && info.links[2].includes('drive.google'));
  check('Sections from v1: About me, Experience, Education, Skills, Tools, Who I am', info.headings.join('|') === 'About Me|Experience|Education|Skills|Tools|"Who I am"', info.headings.join(' | '));
  check('Experience adds the Cipher internship (dates TODO)', info.experience[0] === 'NBA Research Lab' && info.experience.length === 3, info.experience.join(', '));
  check('Rows fade in as they enter; six "Who I am" photos', info.rows >= 10 && info.photos === 6, `${info.rows} rows`);
  check('Portrait is sticky on the left half; About is current in the nav', info.portraitSticky === 'sticky' && info.navCurrent === 'page');
  check('No footer (the page flows into Work); "Go to Work →" in the ending', !info.footer && info.cta === 'Go to Work →');
  check('No sideways scroll', info.overflow <= 0);

  // parallax
  const before = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-about-portrait]')).transform).f);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#about-skills').offsetTop));
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-about-portrait]')).transform).f);
  check('Portrait drifts with scroll (subtle parallax)', after > before && after - before < 120, `${before.toFixed(1)} → ${after.toFixed(1)}px`);

  // ending scrubs the counter
  await scrollEnd(page, 0.5);
  await page.waitForTimeout(700);
  const half = await endProgress(page);
  const scale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-about-end] [data-comp-media]')).transform).a);
  check('Ending: scroll scrubs the counter and grows the image', half > 35 && half < 65 && scale > 0.8 && scale < 1.1, `${half}, image ×${scale.toFixed(2)}`);

  // reaching 100 then going back up quickly cancels
  await scrollEnd(page, 1);
  await page.waitForTimeout(120);
  await scrollEnd(page, 0.7);
  await page.waitForTimeout(800);
  check('Scrolling back before the hold ends cancels the hand-off', page.url().endsWith('/about/'));

  // a slide other than the first was viewed on Work earlier in the session
  await page.evaluate(() => sessionStorage.setItem('stage-index', '2'));

  // hold at 100 → Work, exit only
  await scrollEnd(page, 1);
  await page.waitForURL(/\/portfolio\/$/, { timeout: 4000 });
  const work = await page.evaluate(() => ({
    splash: document.documentElement.classList.contains('splash-on'),
    count: document.querySelector('[data-splash] [data-comp-count]')?.textContent,
    query: location.search,
  }));
  check('At 100 it carries on to Work, starting from the end state (counter at 100)', work.splash && work.count === '100' && work.query === '', JSON.stringify(work));
  await page.waitForFunction(() => !document.documentElement.classList.contains('splash-on'), null, { timeout: 4000 });
  check('Work plays only the splash exit (no loading phase)', true);
  const active = await page.evaluate(() => document.querySelector('[data-stage-slide].is-active')?.dataset.id);
  check('Work opens on NBA Research Lab, not the slide last viewed', active === 'nba-research-lab', active);
  await page.waitForTimeout(800);

  // Back → About, no loop
  await page.goBack();
  await page.waitForURL(/\/about\/?$/);
  await page.waitForTimeout(1500);
  check('Back from Work returns to About and stays there', page.url().endsWith('/about/'));
  await page.close();
}

// ------------------------------------------------------- reduced, JA, phone
{
  console.log('\nReduced motion, Japanese, phone');
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  watch(rp);
  await rp.goto(`${BASE}/about/`);
  await ready(rp);
  await scrollEnd(rp, 1);
  await rp.waitForTimeout(1000);
  check('Reduced motion: no automatic hand-off; the ending shows 100', rp.url().endsWith('/about/') && (await endProgress(rp)) === 100);
  await rp.click('[data-comp-cta]');
  await rp.waitForURL(/\/portfolio\/$/);
  check('"Go to Work →" link works', rp.url().endsWith('/portfolio/'));
  await reduced.close();

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/ja/about/`);
  await ready(page);
  const ja = await page.evaluate(() => ({
    lead: document.querySelector('.about__lead').textContent.slice(0, 6),
    cta: document.querySelector('[data-comp-cta]').getAttribute('href'),
    label: document.querySelector('.comp__label').textContent,
  }));
  check('JA: v1 Japanese copy; the ending leads to the JA stage', ja.lead === 'こんにちは,' && ja.cta.endsWith('/portfolio/ja/'), `${ja.lead} ${ja.cta}`);
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  watch(pp);
  await pp.goto(`${BASE}/about/`);
  await ready(pp);
  const m = await pp.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, sticky: getComputedStyle(document.querySelector('.about__portrait')).position }));
  check('Phone: portrait stacks on top, no sideways scroll', m.overflow <= 0 && m.sticky === 'relative', JSON.stringify(m));
  await phone.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll about checks passed');
process.exit(failures ? 1 : 0);
