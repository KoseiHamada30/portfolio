// Work stage checks (DESIGN.md §8, Phase 4R-b).
//   npm run dev   (in another terminal)
//   npm run check:stage
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
const state = (page) =>
  page.evaluate(() => {
    const slides = [...document.querySelectorAll('[data-stage-slide]')];
    const active = slides.findIndex((s) => s.classList.contains('is-active'));
    const box = slides[active]?.getBoundingClientRect();
    return {
      active,
      title: slides[active]?.dataset.title,
      centred: box ? Math.abs(box.left + box.width / 2 - innerWidth / 2) : null,
      live: document.querySelector('[data-stage-live]').textContent,
      lit: slides.find((s) => s.classList.contains('is-lit'))?.dataset.title,
      shown: [...document.querySelectorAll('[data-stage-titles] .stage__caption')].find((c) => parseFloat(getComputedStyle(c).opacity) > 0.9)?.querySelector('[data-stage-title]').firstChild.textContent.trim(),
      view: document.querySelector('[data-stage]').dataset.view,
    };
  });
const settle = (page) => page.waitForTimeout(1700);

// ------------------------------------------------------------ desktop
{
  console.log('\nSlider (desktop)');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(`${BASE}/`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await ready(page);
  await settle(page);

  const first = await page.evaluate(() => ({
    titles: [...document.querySelectorAll('[data-stage-slide]')].map((s) => s.dataset.title),
    virtual: document.querySelector('[data-stage]').classList.contains('is-virtual'),
    links: [...document.querySelectorAll('[data-stage-link]')].map((a) => a.getAttribute('href')),
    roledesc: document.querySelector('[data-stage]').getAttribute('aria-roledescription'),
    sub: document.querySelectorAll('[data-stage-sub]')[1].textContent.trim(),
    quest: document.querySelectorAll('[data-stage-sub]')[4].textContent.trim(),
    filterActive: getComputedStyle(document.querySelector('.stage__slide.is-active .stage__media')).filter,
    filterOther: getComputedStyle(document.querySelectorAll('.stage__media')[1]).filter,
    height: document.querySelector('.stage__slide').getBoundingClientRect().height,
    bg: getComputedStyle(document.body).backgroundColor,
    footer: !!document.querySelector('footer'),
  }));
  check('Six items: NBA Research Lab first, then the other projects, then side quests', first.titles.join(',') === 'NBA Research Lab,Circula,Reverie,NextScore,Brim CC,Honne Festa', first.titles.join(', '));
  check('GSAP slider on a fine pointer', first.virtual);
  check('A carousel of links to each case page', first.roledesc === 'carousel' && first.links.every((h, i) => h.endsWith(`/work/${['nba-research-lab', 'circula', 'reverie', 'nextscore', 'brim-cc', 'honne-festa'][i]}/`)));
  check('Subline from the v1 category, without brackets', first.sub === '/App/Website design', first.sub);
  check('Side quests are labelled', first.quest === '/Side quest · Graphic design', first.quest);
  check('Centre slide in colour, neighbours monochrome and dimmed', first.filterActive === 'none' && first.filterOther.includes('grayscale(1)'), first.filterOther);
  check('Full-height slides on the dark stage, no footer', first.height === 900 && first.bg === 'rgb(35, 35, 35)' && !first.footer, `${first.height}px ${first.bg}`);

  let s = await state(page);
  check('Starts on NBA Research Lab, centred', s.title === 'NBA Research Lab' && s.centred < 2);
  check('No "+" marks on the stage', (await page.evaluate(() => !document.querySelector('[data-stage-scope], .comp__plus'))));
  check('System cursor (hand over slides), no custom cursor', (await page.evaluate(() => !document.querySelector('[data-cursor-root]') && getComputedStyle(document.querySelector('[data-stage-link]')).cursor === 'pointer')));

  // wheel
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 260);
  await page.waitForTimeout(120);
  const skew = await page.evaluate(() => getComputedStyle(document.querySelector('[data-stage-slide]')).transform);
  await settle(page);
  s = await state(page);
  check('Wheel moves to the next project and snaps', s.title === 'Circula' && s.centred < 2, `${s.title}, ${s.centred?.toFixed(1)}px off centre`);
  check('Live region announces it', s.live === 'Project 2 of 6: Circula', s.live);
  const m = skew.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number);
  const skewDeg = m ? Math.abs((Math.atan2(m[2], m[3]) * 180) / Math.PI) : 0;
  // one strong trackpad flick (a burst plus a decaying momentum tail) moves exactly one slide
  await page.waitForTimeout(400);
  const beforeFlick = (await state(page)).active;
  for (const d of [80, 140, 160, 150, 120, 95, 75, 60, 46, 35, 26, 19, 14, 10, 7, 5, 3, 2, 1]) {
    await page.mouse.wheel(0, d);
    await page.waitForTimeout(16);
  }
  await settle(page);
  const afterFlick = (await state(page)).active;
  check('One strong scroll moves exactly one slide', afterFlick === (beforeFlick + 1) % 6, `${beforeFlick} → ${afterFlick}`);
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  check('Movement adds a skew (≤ 4°)', skewDeg > 0.05 && skewDeg <= 4.01, `${skewDeg.toFixed(2)}°`);

  // keys + loop
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  s = await state(page);
  check('Arrow keys move and the loop wraps (NBA Research Lab ← Honne Festa)', s.title === 'Honne Festa' && s.centred < 2, `${s.title} ${s.centred}`);
  await page.keyboard.press('ArrowRight');
  await settle(page);

  // click neighbour
  const nextBox = await page.locator('[data-stage-slide]').nth(1).boundingBox();
  await page.mouse.move(Math.min(1430, nextBox.x + 60), 450, { steps: 4 });
  await page.waitForTimeout(250);
  await page.waitForTimeout(1200);
  const hov = await state(page);
  const hovFilter = await page.evaluate(() => [...document.querySelectorAll('.stage__media')].map((m) => getComputedStyle(m).filter));
  check('Hovering a neighbour: it turns colour, the centre goes grey', hov.lit === 'Circula' && hovFilter[(hov.active + 1) % 6] === 'none' && hovFilter[hov.active].includes('grayscale(1)'), `${hov.lit}: ${hovFilter.join(' | ')}`);
  check('The centred title follows the hovered slide (crossfade, no roll)', hov.shown === 'Circula' && (await page.evaluate(() => [...document.querySelectorAll('[data-stage-titles] [data-stage-title]')].every((t) => !t.style.transform || /translate\(0(px|%), 0(px|%)\)|none/.test(t.style.transform)))), hov.shown);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  s = await state(page);
  check('Clicking a neighbour brings it to the centre (no navigation)', s.title === 'Circula' && page.url().endsWith('/portfolio/'), s.title);

  // drag with inertia
  await page.mouse.move(900, 450);
  await page.mouse.down();
  for (let x = 900; x >= 500; x -= 40) await page.mouse.move(x, 450);
  await page.mouse.up();
  await settle(page);
  s = await state(page);
  check('Dragging left moves forward and snaps', ['Reverie', 'NextScore'].includes(s.title) && s.centred < 2, s.title);
  check('A drag does not open the project', page.url().endsWith('/portfolio/'));

  // lens: moving the pointer reveals a colour blob that trails it, gone again at rest
  await page.mouse.move(1200, 450);
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(1200 - i * 50, 450 + i * 15);
    await page.waitForTimeout(16);
  }
  const moving = await page.evaluate(() => [...document.querySelectorAll('.stage__lens')].some((l) => l.style.clipPath.startsWith('polygon')));
  await page.waitForTimeout(1500);
  const resting = await page.evaluate(() => [...document.querySelectorAll('.stage__lens')].filter((l) => l.style.clipPath !== 'circle(0px)').length);
  check('Colour lens trails the moving pointer; at rest only the hovered slide keeps its fill', moving && resting === 1, `${resting} open at rest`);

  // hover fill grows outward from the pointer over ~1s
  await page.mouse.move(720, 450);
  await page.waitForTimeout(1500);
  const nb = await page.locator('[data-stage-slide]').nth(((await state(page)).active + 1) % 6).boundingBox();
  await page.mouse.move(Math.min(1430, nb.x + 120), 600, { steps: 2 });
  const spread = [];
  for (const wait of [80, 300, 900]) {
    await page.waitForTimeout(wait);
    spread.push(await page.evaluate(() => {
      const lens = document.querySelector('.stage__slide.is-lit .stage__lens');
      const pts = (lens?.style.clipPath.match(/-?[\d.]+px -?[\d.]+px/g) ?? []).map((p) => p.split(' ').map(parseFloat));
      if (pts.length < 3) return 0;
      const xs = pts.map((p) => p[0]);
      return Math.round(Math.max(...xs) - Math.min(...xs));
    }));
  }
  check('Hover colour spreads out from the pointer (circle keeps growing)', spread[0] < spread[1] && spread[1] < spread[2] && spread[2] < 1440 * 0.9, spread.join(' → ') + 'px wide');

  // tab focus
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  const before = (await state(page)).active;
  await page.locator('[data-stage-link]').nth((before + 1) % 6).focus();
  await settle(page);
  s = await state(page);
  check('Focusing a slide link centres it', s.active === (before + 1) % 6, s.title);
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('Visible focus ring', ring !== 'none', ring);

  // index view
  await page.click('[data-view-option="index"]');
  await page.waitForTimeout(700);
  const idx = await page.evaluate(() => ({
    view: document.querySelector('[data-stage]').dataset.view,
    shown: !document.querySelector('[data-stage-index]').hidden,
    rows: [...document.querySelectorAll('.stage-index__row')].map((r) => r.querySelector('.stage-index__title').textContent),
    inert: document.querySelector('[data-stage-track]').inert,
  }));
  check('Index view: a text list of every project', idx.view === 'index' && idx.shown && idx.rows.length === 6 && idx.inert);
  await page.hover('.stage-index__row:nth-child(3) a');
  await page.waitForTimeout(1000);
  const prev = await page.evaluate(() => ({
    on: document.querySelector('[data-index-preview]').classList.contains('is-on'),
    id: document.querySelector('[data-index-preview] .is-shown')?.dataset.previewId,
    filter: getComputedStyle(document.querySelector('[data-index-preview] .is-shown')).filter,
  }));
  check('Hovering a row shows its preview, ending in colour', prev.on && prev.id === 'reverie' && prev.filter === 'grayscale(0)', `${prev.id} ${prev.filter}`);
  await page.reload();
  await ready(page);
  check('View choice is remembered', (await state(page)).view === 'index');
  await page.click('[data-view-option="stage"]');
  await page.waitForTimeout(500);

  // open the active project, then come back to the same slide
  await page.keyboard.press('ArrowRight');
  await settle(page);
  const opened = (await state(page)).title;
  const activeBox = await page.locator('.stage__slide.is-active').boundingBox();
  await page.mouse.click(activeBox.x + activeBox.width / 2, 400);
  await page.waitForURL(/\/work\//);
  await ready(page, 2);
  check('Clicking the centre slide opens the project', page.url().includes('/work/'), page.url());
  await page.click('[data-nav-item="work"]');
  await page.waitForURL(/\/portfolio\/$/);
  await ready(page, 3);
  await settle(page);
  s = await state(page);
  check('Back on Work, the same slide is centred', s.title === opened && s.centred < 2, `${opened} → ${s.title}`);
  check('No ScrollTriggers or stray tickers after navigation', (await page.evaluate(() => window.__motion.triggers())) === 0);
  await page.close();
}

// --------------------------------------------------- JA + side quest
{
  console.log('\nJapanese & side quests');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/ja/`);
  await ready(page);
  const ja = await page.evaluate(() => ({
    sub: document.querySelectorAll('[data-stage-sub]')[1].textContent.trim(),
    quest: document.querySelectorAll('[data-stage-sub]')[5].textContent.trim(),
    about: document.querySelector('[data-nav-item="info"]').textContent.trim(),
  }));
  check('JA sublines', ja.sub === '/アプリ／Webデザイン' && ja.quest === '/サイドクエスト · グラフィックデザイン', `${ja.sub} | ${ja.quest}`);
  const res = await page.goto(`${BASE}/work/honne-festa/`);
  check('Side-quest slides link to a page that exists', res.status() === 200);
  await page.close();
}

// --------------------------------------------------------- touch
{
  console.log('\nTouch');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);
  const t = await page.evaluate(() => ({
    virtual: document.querySelector('[data-stage]').classList.contains('is-virtual'),
    snap: getComputedStyle(document.querySelector('[data-stage-track]')).scrollSnapType,
    cursor: document.documentElement.classList.contains('has-cursor'),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check('Native scroll-snap, no custom cursor', !t.virtual && t.snap.includes('mandatory') && !t.cursor, t.snap);
  check('No sideways page scroll', t.overflow <= 0);
  await page.evaluate(() => {
    const track = document.querySelector('[data-stage-track]');
    const slide = document.querySelectorAll('[data-stage-slide]')[2];
    track.scrollLeft = slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2;
  });
  await page.waitForTimeout(500);
  check('Swiping updates the active slide', (await state(page)).title === 'Reverie');
  await ctx.close();
}

// ----------------------------------------------------- reduced motion / no JS
{
  console.log('\nReduced motion & no JS');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);
  await page.evaluate(() => sessionStorage.clear());
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  const r = await state(page);
  const tf = await page.evaluate(() => getComputedStyle(document.querySelector('.stage__slide.is-active')).transform);
  check('Reduced motion: jumps straight to the slide, no skew', r.centred < 2 && !/matrix\([^,]+, [^,]+, -?0\.0[1-9]/.test(tf), tf);
  await ctx.close();

  const nctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const np = await nctx.newPage();
  await np.goto(`${BASE}/`);
  const n = await np.evaluate(() => ({
    links: document.querySelectorAll('[data-stage-link]').length,
    snap: getComputedStyle(document.querySelector('[data-stage-track]')).scrollSnapType,
    views: getComputedStyle(document.querySelector('[data-stage-views]')).display,
  }));
  check('No JS: a scroll-snap list of six links, no view toggle', n.links === 6 && n.snap.includes('mandatory') && n.views === 'none');
  await nctx.close();
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll stage checks passed');
process.exit(failures ? 1 : 0);
