// Home page checks: hero, spotlight grid ↔ list, hover preview, side-quest shelf.
//   npm run dev   (in another terminal)
//   npm run check:home
// Env: BASE_URL (default http://localhost:4321/portfolio), PW_CHROMIUM (optional browser path).
import { launch } from './_browser.mjs';

const BASE = (process.env.BASE_URL ?? 'http://localhost:4321/portfolio').replace(/\/$/, '');

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
async function ready(page, count = 1) {
  await page.waitForFunction((n) => window.__motion?.setups() >= n, count, { timeout: 20000 });
  await page.waitForTimeout(300);
}
/** Run an action that triggers a ClientRouter navigation and wait for the next page setup. */
async function navigate(page, action) {
  const current = await page.evaluate(() => window.__motion.setups());
  await action();
  await ready(page, current + 1);
}

const browser = await launch();
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
};

// ----------------------------------------------------------------- Hero
{
  console.log('\nHero');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);
  await page.waitForTimeout(1300);
  const hero = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(),
    h1Count: document.querySelectorAll('h1').length,
    letters: [...document.querySelectorAll('[data-hero-char]')].map((el) => el.textContent).join(''),
    settled: [...document.querySelectorAll('[data-hero-char]')].every((el) => {
      const t = getComputedStyle(el).transform;
      return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
    }),
    titleOpacity: getComputedStyle(document.querySelector('[data-hero-title]')).opacity,
    blob: getComputedStyle(document.querySelector('.blob span')).animationName,
    lead: document.querySelector('.hero__lead')?.innerHTML,
  }));
  check('One h1; letters spell KOSEI©', hero.h1Count === 1 && hero.letters === 'KOSEI©', hero.h1);
  check('Letters finished rising, title visible', hero.settled && hero.titleOpacity === '1');
  check('Blob drifts (CSS animation)', hero.blob === 'drift');
  check('v1 intro line rendered with its <b> markup', hero.lead?.includes('<b>Kosei Hamada</b>') && hero.lead.includes('hassles'));

  await page.mouse.move(1270, 790, { steps: 8 });
  await page.waitForTimeout(1500);
  const lean = await page.locator('[data-blob]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));
  check('Blob leans toward the cursor, max 20px', lean.e > 0 && lean.e <= 20 && lean.f > 0 && lean.f <= 20, `x ${lean.e.toFixed(1)}, y ${lean.f.toFixed(1)}`);
  await page.close();

  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  await rp.goto(`${BASE}/`);
  await ready(rp);
  await rp.waitForTimeout(400);
  const reduced = await rp.evaluate(() => ({
    moved: [...document.querySelectorAll('[data-hero-char]')].some((el) => getComputedStyle(el).transform !== 'none'),
    opacity: getComputedStyle(document.querySelector('[data-hero-title]')).opacity,
    blob: getComputedStyle(document.querySelector('.blob span')).animationName,
  }));
  check('Reduced: title fades in, letters never move', !reduced.moved && reduced.opacity === '1');
  check('Reduced: blob is still', reduced.blob === 'none');
  await rctx.close();
}

// ------------------------------------------------------- Spotlight work
{
  console.log('\nSpotlight work');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);

  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.work-item')].map((li) => ({
      name: li.querySelector('.work-card__name').textContent,
      vt: getComputedStyle(li.querySelector('.work-card__cover')).viewTransitionName,
      todo: li.querySelector('.cover-placeholder__todo')?.textContent ?? null,
    })),
  );
  check('Order: Circula, Reverie, NextScore, NBA Research Lab', cards.map((c) => c.name).join(',') === 'Circula,Reverie,NextScore,NBA Research Lab');
  check('Covers carry transition:name cover-{slug}', cards.every((c) => /^cover-/.test(c.vt)), cards.map((c) => c.vt).join(', '));
  check('NBA Research Lab shows a TODO cover, no invented image', cards[3]?.todo === 'TODO(kosei): cover image');

  await page.locator('[data-view-toggle]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const before = await page.locator('.work-item').nth(1).boundingBox();
  await page.click('[data-view-option="list"]');
  await page.waitForTimeout(120);
  const mid = await page.locator('.work-item').nth(1).evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(2000);
  const list = await page.evaluate(() => ({
    view: document.querySelector('[data-work]').dataset.view,
    pressed: document.querySelector('[data-view-option="list"]').getAttribute('aria-pressed'),
    coverHidden: getComputedStyle(document.querySelector('.work-card__cover')).display === 'none',
    stored: localStorage.getItem('work-view'),
    inline: [...document.querySelectorAll('.work-item')].some((el) => el.style.position === 'absolute'),
  }));
  const after = await page.locator('.work-item').nth(1).boundingBox();
  check('Toggle switches to list (aria-pressed, covers hidden)', list.view === 'list' && list.pressed === 'true' && list.coverHidden);
  check('Flip animated the change', mid !== 'none', mid);
  check('Flip cleaned up after itself', !list.inline);
  check('Second card moved from the right column into a full-width row', after.x < before.x && after.height < before.height && after.width > before.width, `x ${Math.round(before.x)}→${Math.round(after.x)}, h ${Math.round(before.height)}→${Math.round(after.height)}`);
  check('View choice stored', list.stored === 'list');

  // Hover preview follows the cursor in list mode
  const row = page.locator('.work-card').nth(2);
  const rb = await row.boundingBox();
  await page.mouse.move(rb.x + 200, rb.y + rb.height / 2, { steps: 5 });
  await page.mouse.move(rb.x + 320, rb.y + rb.height / 2, { steps: 8 });
  await page.waitForTimeout(500);
  const preview = await page.evaluate(() => {
    const el = document.querySelector('[data-work-preview]');
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { opacity: getComputedStyle(el).opacity, active: el.querySelector('.is-active')?.dataset.previewId, x: m.e };
  });
  check('Hovering a row shows that project\'s preview', preview.opacity === '1' && preview.active === 'nextscore', `${preview.active}, opacity ${preview.opacity}`);
  check('Preview follows the pointer', preview.x > rb.x + 320, `x ${Math.round(preview.x)}`);
  await page.mouse.move(5, 5, { steps: 4 });
  await page.waitForTimeout(400);
  check('Preview hides when leaving the list', (await page.locator('[data-work-preview]').evaluate((el) => getComputedStyle(el).opacity)) === '0');

  await page.reload();
  await ready(page);
  check('List view persists on reload', (await page.locator('[data-work]').getAttribute('data-view')) === 'list');
  await page.click('[data-view-option="grid"]');
  await page.waitForTimeout(2000);
  check('And switches back to grid', (await page.locator('[data-work]').getAttribute('data-view')) === 'grid');

  // Card → case-study placeholder via ClientRouter, cover transition name on both ends
  await page.locator('.work-card').first().scrollIntoViewIfNeeded();
  await page.evaluate(() => (window.__same = true));
  await navigate(page, () => page.locator('.work-card').first().click());
  const dest = await page.evaluate(() => ({ path: location.pathname, same: window.__same === true, vt: getComputedStyle(document.querySelector('.case__cover')).viewTransitionName }));
  check('Card opens /work/circula/ without a full reload', dest.path.endsWith('/work/circula/') && dest.same);
  check('Destination cover has the matching transition:name', dest.vt === 'cover-circula');
  await ctx.close();
}

// ---------------------------------------------------------- Side quests
{
  console.log('\nSide Quests');
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);
  const shelf = page.locator('[data-shelf]');
  await shelf.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const info = await shelf.evaluate((el) => ({
    cards: [...el.querySelectorAll('.quest__title')].map((h) => h.textContent),
    todo: el.querySelector('.cover-placeholder__todo')?.textContent,
    overflow: el.scrollWidth - el.clientWidth,
  }));
  check('Two side quests: Brim CC (TODO cover) and Honne Festa', info.cards.join(',') === 'Brim CC,Honne Festa' && info.todo === 'TODO(kosei): cover image');
  check('Shelf overflows at 375px, so there is something to drag', info.overflow > 0, `${info.overflow}px`);

  const box = await shelf.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const dragged = await shelf.evaluate((el) => el.scrollLeft);
  check('Mouse drag scrolls the shelf (with inertia)', dragged > 50, `scrollLeft ${Math.round(dragged)}`);

  await shelf.evaluate((el) => (el.scrollLeft = 0));
  await shelf.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const keyed = await shelf.evaluate((el) => ({ left: el.scrollLeft, focused: document.activeElement === el }));
  check('Keyboard: focusable shelf scrolls with arrow keys', keyed.focused && keyed.left > 0, `scrollLeft ${Math.round(keyed.left)}`);
  await page.close();
}

// ------------------------------------------------- Leak + responsive
{
  console.log('\nLifecycle & layout');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page);
  await page.goto(`${BASE}/`);
  await ready(page);
  const counts = [await page.evaluate(() => window.__motion.triggers())];
  for (let i = 0; i < 5; i++) {
    await navigate(page, () => page.locator('.work-card').nth(1).click());
    await navigate(page, () => page.click('[data-nav-item="work"]'));
    counts.push(await page.evaluate(() => window.__motion.triggers()));
  }
  check('Home ScrollTrigger count stable over 5 round trips to a case study', counts.every((c) => c === counts[0]), counts.join(' → '));
  await page.close();

  for (const width of [375, 768, 1280, 1920]) {
    const p = await browser.newPage({ viewport: { width, height: 800 } });
    let worst = 0;
    for (const path of ['/', '/ja/', '/work/nba-research-lab/']) {
      await p.goto(`${BASE}${path}`);
      await ready(p);
      worst = Math.max(worst, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    }
    check(`No horizontal scroll at ${width}px`, worst <= 0, worst ? `${worst}px` : '');
    await p.close();
  }
}

await browser.close();
check('No page or console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll home checks passed');
process.exit(failures ? 1 : 0);
