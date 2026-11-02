// Packs the real Astro build (dist/) into a folder the Site Tuner artifact can serve:
// rewrites the /portfolio base to relative paths, adds the tuner bridge to every page,
// and keeps only the files the pages actually use (woff2 only; JA font subsets by glyph).
//   node tools/site-tuner/build.mjs dist <out>/site
import fs from 'node:fs';
import path from 'node:path';

const [dist, out] = process.argv.slice(2);
const PAGES = [
  'index.html', 'info/index.html', 'ja/index.html', 'ja/info/index.html',
  ...['circula', 'reverie', 'nextscore', 'nba-research-lab', 'brim-cc', 'honne-festa'].flatMap((s) => [`work/${s}/index.html`, `ja/work/${s}/index.html`]),
];

fs.rmSync(out, { recursive: true, force: true });
const write = (rel, data) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), data);
};

const assets = new Set();
const publicFiles = new Set(); // e.g. media/circula/listview.mp4 (served from public/)
let glyphs = '';

// Pages are flattened into one folder (info/index.html → info.html, ja/work/x/ → ja-work-x.html) so
// every relative URL means the same thing on every page; ClientRouter swaps heads between pages.
const flat = (p) => (p.replace(/index\.html$/, '').replace(/\/$/, '').replaceAll('/', '-') || 'index') + '.html';
const fixJa = (p) => (p === 'ja.html' ? 'ja-index.html' : p);
const up = '';

for (const page of PAGES) {
  let html = fs.readFileSync(path.join(dist, page), 'utf8');
  glyphs += html.replace(/<[^>]+>/g, '');
  html = html.replace(/(?:https:\/\/koseihamada30\.github\.io)?\/portfolio\/([^"'\s)?#,]*)/g, (_, p) => {
    if (p.startsWith('_astro/')) assets.add(p.slice(7));
    else if (/\.\w+$/.test(p) && p !== 'favicon.svg' && fs.existsSync(path.join(dist, p))) publicFiles.add(p);
    if (p === '' || p.endsWith('/')) p = fixJa(flat(p));
    return up + p;
  });
  html = html.replace('<head>', `<head><script src="${up}tuner-bridge.js"></script>`);
  write(fixJa(flat(page)), html);
}

// i18n strings may appear in JS-rendered UI too
for (const f of ['en.json', 'ja.json']) glyphs += fs.readFileSync(path.join(dist, '..', 'src/i18n', f), 'utf8');
const have = new Set([...glyphs].map((c) => c.codePointAt(0)));

const inRange = (range) => range.split(',').some((part) => {
  const [a, b] = part.trim().replace('U+', '').split('-').map((h) => parseInt(h, 16));
  for (const cp of have) if (cp >= a && cp <= (b ?? a)) return true;
  return false;
});

for (const name of fs.readdirSync(path.join(dist, '_astro'))) {
  const src = path.join(dist, '_astro', name);
  if (name.endsWith('.css')) {
    let css = fs.readFileSync(src, 'utf8');
    // JA fonts: keep only the subsets whose unicode-range covers glyphs on the site
    css.replace(/@font-face\{[^}]*\}/g, (face) => {
      const url = face.match(/url\(\/portfolio\/_astro\/([^)]+\.woff2)\)/)?.[1];
      const range = face.match(/unicode-range:([^;}]*)/)?.[1];
      if (url && (!range || !/shippori|zen-kaku/.test(url) || inRange(range))) assets.add(url);
    });
    css = css.replaceAll('/portfolio/_astro/', '');
    write(`_astro/${name}`, css);
  } else if (name.endsWith('.js')) {
    let js = fs.readFileSync(src, 'utf8');
    const root = '(new URL(`..`,import.meta.url).pathname)';
    js = js.replaceAll('`/portfolio/`', root).replaceAll('`/portfolio`', `${root}.replace(/\\/$/,\`\`)`);
    // home is index.html here, not the bare directory
    js = js.replace('.replace(/^ja(\\/|$)/,``)', '.replace(/^ja(\\/|-|$)/,``)');
    js = js.replace('t===``||t.startsWith(`work`)', '(t===``||t===`index.html`||t.startsWith(`work`))');
    if (!js.includes('/^ja(\\/|-|$)/') && js.includes('^ja(')) throw new Error('nav ja patch failed');
    if (js.includes('/portfolio')) throw new Error(`base left in ${name}`);
    write(`_astro/${name}`, js);
  }
}

let copied = 0;
for (const name of assets) {
  if (name.endsWith('.css') || name.endsWith('.js')) continue;
  fs.copyFileSync(path.join(dist, '_astro', name), path.join(out, '_astro', name));
  copied++;
}
for (const file of publicFiles) {
  fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
  fs.copyFileSync(path.join(dist, file), path.join(out, file));
}
fs.copyFileSync(path.join(dist, 'favicon.svg'), path.join(out, 'favicon.svg'));
fs.copyFileSync(new URL('./tuner-bridge.js', import.meta.url), path.join(out, 'tuner-bridge.js'));
console.log(`pages ${PAGES.length}, assets ${copied}, public files ${publicFiles.size}`);
