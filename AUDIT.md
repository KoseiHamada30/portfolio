# AUDIT.md — v1 portfolio inventory (2026-10-25)

Read-only audit of the v1 static site on `master` (commit `5c6c427`), done before the Astro v2 rebuild.
Nothing in the repo was changed except adding this file.

> **Setup note:** the prompt-pack files are not at the repo root yet. `CLAUDE.md` is still in
> `20261025_portfolio-v2-prompt-pack/`, and the design system is at the root as `DESIGN_portfolio.md`
> (CLAUDE.md refers to it as `DESIGN.md`). Branch `v2-redesign` does not exist yet.

---

## 1. Pages and sections (content to migrate)

All pages share the same **Nav** (brand "Kosei Hamada / UX Designer", pill `Work¹ Info²`, EN/JP toggle,
`• Contact`) and **Footer** ("LET'S CONNECT" ×8 marquee, email `khamada@student.unimelb.edu.au`,
`• View Resume` → Google Drive link, `© Kosei Hamada 2025`, TikTok / LinkedIn / mail icons).
Static HTML text is authored in **Japanese**; `i18n.js` swaps it to English on load (default `en`).

### 1.1 `index.html` — Home
| # | Section | Content |
|---|---|---|
| 1 | Hero | `KOSEI©` display title over `Fluid-sphere-unscreen.gif` + CSS `.gradient-arc` |
| 2 | Introduction | `intro-text` one-liner (EN/JA), `• Read my story` → info.html |
| 3 | Work — "Project" | 3 spotlight cards: **Circula** (`circula_frontpic.png`), **Reverie** (`reverie_thumbnail2.png`), **NextScore** (`nextscore_mockup.png`). Each: title – subtitle, `(category)` |
| 4 | "Outside the Spotlight" (collapsible) | 3 secondary cards: Branding Local Business in Melbourne → `graphic-design.html#melbourne-business`; Branding Activist Movement → `graphic-design.html#activist-movement`; SheSaidK – personal chat grader → `side-hackathon.html`. **All three thumbnails missing** (placeholder via `onerror`). |
| 5 | Footer | see above |

### 1.2 `info.html` — Info
| # | Section | Content |
|---|---|---|
| 1 | Hero | `info-hero` greeting paragraph (contains `<b>` + `<br>`), `profile.JPG` |
| 2 | About Me | 3 paragraphs (`about-me-1..3`) |
| 3 | Skills… | (a) UX Design, (b) Problem Discovery, (c) Solution Proposal, (d) Professional Document Creation — title + description each |
| 4 | Experience… | 2024–present · Melbourne · BDes UX Design, University of Melbourne / 2025–present · Melbourne · UX Designer, Circula (student-led startup) / 2025–present · Tokyo · UX Design Intern, Nandemo Draft Inc. |
| 5 | Tools… | Figma, Cursor, Canva, Google Script, Framer (logo + name) |
| 6 | "Who I am" | 6-photo grid: New York, Hong Kong, café, Japan, Stranger Things, `IMG_8130.JPG` |
| 7 | Footer | |

### 1.3 `circula.html` — Circula (accent `#F39237`)
| # | Section | Content / media |
|---|---|---|
| — | Hero image | `circula_frontpage.png` |
| — | Hero | Subtitle "Never miss a moment on Campus.", 2 description paras. Meta: Type = App / Website design · Duration = Ongoing · Role = UX designer / UX researcher · Tools = Figma / Cursor / Framer |
| — | Full-bleed image | `Slide 4_3 - 1.png` |
| 01 | Challenge | "Campus information is fragmented" + 1 para |
| 02 | Problem Discovery | "People learn too late" + 4 paras |
| 03 | Research | "How students find campus information": ① Survey (3 findings) ② Interview insights (3 findings) |
| 04 | What is this app? | "All the events and clubs in one app" + para + `circula_features.png` |
| 05 | Visual Design | "Event/club discovery experience on mobile app": 1. Map and list together · 2. Scannable hierarchy · 3. Intuitive search + `circula_screen.png` |
| 06 | UX Experience | "Key user flows": Discover nearby (**Figma prototype iframe**), Browse in list view (`listview.mov`), Find your favourite club (`clubsearch.mov`) |
| 07 | Ongoing research | Intro; qualitative feedback (lead + 3 points); quantitative: **SUS chart** (Chart.js, n=10, 9 items) + caption + footnote |
| 08 | Future Outlook | "Reflection and next steps": What I liked (3) · Next (3) |

### 1.4 `social-media-campaign.html` — Reverie (accent night `#1E3A8A` / morning `#F07A3C`)
| # | Section | Content / media |
|---|---|---|
| — | Hero image | `Reverie_title.png` |
| — | Hero | "Sleep can be changed in 30 mins" + desc. Meta: Type = *UX design (hard-coded)* · Duration = 3 days · Role = *UX/UI designer (hard-coded)* · Team = *Alex Zhang (background researcher), Shun Fukui (UI designer), Elaine Shi (background researcher / visual designer) (hard-coded)* |
| — | Full-bleed image | `reverie_morning1.png` |
| 01 | Challenge | "Irregular sleep routines lead to decreased productivity" + 3 paras |
| — | Image pair | `morningroutine_mockup.png`, `nightroutine_mockup.png` |
| 02 | Problem Discovery | "Not eating breakfast" + 4 paras + brainstorm/roadmap image (**language-swapped**: EN `reverie-roadmap-english.png`, JA `reverie_brainstorming.png`) |
| 03 | User Research & Analysis | ① Survey (2 findings + conclusion) ② Sleep quality (2 findings + conclusion) |
| 04 | What is this app? | "Optimizing the 30-minute routine…" + features image (**language-swapped**: `reverie_function.png` / `reverie_function_jp.png`) |
| — | Mockups | `morning_mockup4.png`, `night_mockup4.png` |
| 05 | Visual Design | "Minimal UI with colour awareness": 1. Minimal · 2. Morning/night colour · 3. Intuitive buttons & nav |
| — | Moodboard + video | `moodboard.png`, `prototype_process.mov` |
| 06 | UX Experience | Pre-sleep routine (**Figma iframe** + note), Post-wake routine (**Figma iframe** + note) |
| 07 | Vibe Coding | "Interactive webapp built with Lovable": outcome videos `morningroutine.mov`, `morning_dashboard.mov`, `nightroutine.mov`; "What I changed": 1. Emotional scale (`emotional_scale.png`), 2. Clock (`clock.png`), 3. Swipe gestures (text only) |
| 08 | Review | Reflection: What I liked (3) · Improvements (3) |

### 1.5 `nextscore.html` — NextScore (accent TODO)
| # | Section | Content / media |
|---|---|---|
| — | Hero image | `nextscore_thumbnail_eng.png` (**language-swapped**, JA `nextscore_thumbnail.png`) |
| — | Hero | "Predictions can be more exciting." + 3 paras. Meta: Type = *UX/UI design (hard-coded)* · Duration = 3 weeks ~ current · Role = *UX/UI designer (hard-coded)* · Tools = *Cursor / Figma / Google Apps Script etc… (hard-coded)* |
| — | Full-bleed image | `nextscore_1.png` |
| 01 | Challenge | "Lack of sports prediction media" + para, then `nextscore_project1.png` |
| 02 | Problem Discovery | "Casual fans who can't get interested…" + 4 paras |
| 03 | User Research & Analysis | ① Survey (2) ② Interviews (2) |
| 04 | What is this app? | "A new form of predictions, created by AI" + para + features image (**language-swapped**: `nextscore_features_eng.png` / `nextscore_features.png`) |
| 05 | Visual Design | 1. Eliminating monotony · 2. Splash screen (`splashscreen.mp4`) · 3. Layout & colour · +α AI prediction automation (`googlescript.png`) |
| 06 | UX Experience | AI predictions for pickup games (`nextscore_userflow1.mp4`), Past predictions & rankings (`nextscore_userflow2.mp4`) |
| 07 | Future Outlook | What I liked (3) · Next (5) |

### 1.6 `graphic-design.html` — Graphic Design (stub)
Hero (title + one-line desc) → (01) Branding Local Business in Melbourne (1 para, **no images**) →
(02) Branding Activist Movement (1 para, **no images**) → `• Back to work`.

### 1.7 `side-hackathon.html` — SheSaidK (stub)
Hero: "SheSaidK – personal chat grader" + "Full write-up coming soon" para → `• Back to work`. **No images, no case study.**

### 1.8 Not in v1 but in the v2 target
`nba-research-lab.mdx` is listed in CLAUDE.md — there is **no v1 content or assets** for it.

---

## 2. i18n

### 2.1 How it works
- `i18n.js`: one `translations = { ja: {...}, en: {...} }` object. **251 keys in each language, identical key sets, no duplicates.**
- `data-i18n="key"` elements get `innerHTML` replaced. Language stored in `localStorage['portfolio-lang']`, default `'en'` (the code comment says "default to Japanese" — out of date).
- Because HTML is authored in JA and swapped to EN after `DOMContentLoaded`, first-time visitors see a **flash of Japanese** before English.
- 4 images are swapped by language in JS (see §1.4/1.5); `sus-results-chart.js` holds its own EN/JA labels (9 items + axis title).

### 2.2 Keys grouped by page
| Group | Keys | Notes |
|---|---|---|
| Shared (all pages) | `contact`, `resume`, `back-to-work` | |
| Shared case-study section labels | `challenge`, `discovery`, `research`, `visual-design`, `ux-experience`, `future`, `review`, `what-is-app` | `what-is-app` is defined but **unused** (heading is hard-coded) |
| Home | `intro-text`, `explore-more-btn`, `circula-subtitle/-category`, `reverie-subtitle/-category`, `nextscore-subtitle/-category`, `graphic-design-1/2-title`, `graphic-design-1/2-category`, `shesaidk-subtitle`, `shesaidk-category` | `intro-text` contains `<b>` |
| Info | `info-hero`, `about-me-1..3`, `skill-*` (8), `exp-*` (12) | `info-hero` contains `<b>`, `<br>` |
| Circula | `circula-*` (71 incl. home card keys) | |
| Reverie | `reverie-*` (74 incl. home card keys) | `reverie-ux-flow3-title/-desc/-note` (Onboarding) **unused** — section removed in `fb0d83a` |
| NextScore | `nextscore-*` (58 incl. home card keys) | `nextscore-future-desc` **unused** |
| Graphic design | `graphic-design-page-title/-desc`, `graphic-design-1/2-desc` | |
| SheSaidK | `shesaidk-page-desc` | |

**Unused keys (5):** `what-is-app`, `nextscore-future-desc`, `reverie-ux-flow3-title`, `reverie-ux-flow3-desc`, `reverie-ux-flow3-note`.

**Same text in EN and JA (not translated, may be intentional):** `graphic-design-1-title`, `graphic-design-2-title`,
`what-is-app`, `circula-meta-tools-value`, `reverie-lovable-section` ("Vibe Coding"), `reverie-lovable-morning-label`, `reverie-lovable-night-label`.

### 2.3 Hard-coded (not translated) text
| Where | Text |
|---|---|
| Nav (all pages) | "Kosei Hamada", "UX Designer", "Work¹", "Info²", "EN" |
| Footer (all pages) | "LET'S CONNECT", email, "© Kosei Hamada 2025" (year hard-coded) |
| `<title>` (all pages) | e.g. "Kosei Hamada - UX Designer & Digital Marketing Specialist"; Reverie page is still titled **"Social Media Campaign"** |
| Home | "KOSEI©", "• Read my story", "Project", project names ("Circula -", "Reverie -", "NextScore -", "SheSaidK -"), "↓" |
| Info | "About Me", "Skills…", "Experience…", "Tools…", "\"Who I am\"", "(a)–(d)", years "2024-", "2025-", tool names |
| Case studies | "What is this app?" (×3), section numbers "(01)–(08)" |
| Reverie meta | Type "UX design", Role "UX/UI designer", 3 team member lines |
| NextScore meta | Type "UX/UI design", Role "UX/UI designer", Tools "Cursor / Figma / Google Apps Script etc..." |
| Video fallbacks | "Your browser does not support the video tag." |
| All `alt` text | English only; several are poor ("Social Media Campaign" on the Reverie card, `alt="cursor"` on the Google Script logo, empty alts on secondary cards, "Personal") |
| `sus-results-chart.js` | Chart labels (bilingual, but outside i18n.js) |

---

## 3. Media assets

Total media at repo root: **≈ 318 MB** — **≈ 259 MB used**, **≈ 59 MB unused**.
Videos alone are ≈ 199 MB; every `.mov` is a 2,000+ px tall screen recording (DESIGN.md target: ≤1080p, < 6 MB each).

### 3.1 Used
| File | Size | Used in |
|---|---|---|
| `reverie_thumbnail2.png` | **13 MB** | index (Reverie card) |
| `reverie_morning1.png` | 8.6 MB | Reverie |
| `nextscore_mockup.png` | 4.8 MB | index (NextScore card) |
| `moodboard.png` | 4.4 MB | Reverie |
| `morning_mockup4.png` | 3.8 MB | Reverie |
| `nextscore_1.png` | 2.6 MB | NextScore |
| `nightroutine_mockup.png` | 2.4 MB | Reverie |
| `Fluid-sphere-unscreen.gif` | 2.2 MB | index hero |
| `night_mockup4.png` | 2.1 MB | Reverie |
| `morningroutine_mockup.png` | 2.0 MB | Reverie |
| `Reverie_title.png` | 1.7 MB | Reverie hero |
| `nextscore_thumbnail.png` | 1.7 MB | NextScore hero (JA, via i18n.js) |
| `nextscore_thumbnail_eng.png` | 1.5 MB | NextScore hero (EN) |
| `clock.png` | 1.3 MB | Reverie |
| `emotional_scale.png` | 1.3 MB | Reverie |
| `circula_frontpage.png` | 1.2 MB | Circula hero |
| `IMG_8130.JPG` | 852 KB | info photos |
| `private_hk.jpg` | 840 KB | info photos |
| `circula_frontpic.png` | 768 KB | index (Circula card) |
| `nextscore_project1.png` | 660 KB | NextScore |
| `private_newyork.jpg` | 532 KB | info photos |
| `reverie_brainstorming.png` | 524 KB | Reverie (JA) |
| `strangerthings.png` | 512 KB | info photos |
| `reverie_function_jp.png` | 500 KB | Reverie (JA, via i18n.js) |
| `reverie-roadmap-english.png` | 480 KB | Reverie (EN, via i18n.js) |
| `circula_screen.png` | 456 KB | Circula |
| `reverie_function.png` | 436 KB | Reverie (EN) |
| `profile.JPG` | 396 KB | info hero |
| `googlescript.png` | 320 KB | NextScore |
| `Slide 4_3 - 1.png` | 296 KB | Circula (filename has spaces) |
| `private_jp.jpg` | 284 KB | info photos |
| `circula_features.png` | 280 KB | Circula |
| `nextscore_features.png` | 268 KB | NextScore (JA) |
| `nextscore_features_eng.png` | 260 KB | NextScore (EN, via i18n.js) |
| `private_cafe.jpg` | 220 KB | info photos |
| `canva.webp` | 88 KB | info tools |
| `googlescript-logo.png` | 76 KB | info tools |
| `cursor.png` | 48 KB | info tools |
| `Figma-logo.png` | 16 KB | info tools |
| `framer-logo.avif` | 16 KB | info tools |

| Video | Size | Duration · height | Used in |
|---|---|---|---|
| `morningroutine.mov` | **59 MB** | 37 s · 2078 px | Reverie (Vibe Coding) |
| `morning_dashboard.mov` | 42 MB | 23 s · 2078 px | Reverie (Vibe Coding) |
| `nightroutine.mov` | 36 MB | 33 s · 2092 px | Reverie (Vibe Coding) |
| `listview.mov` | 22 MB | 20 s · 2380 px | Circula UX |
| `clubsearch.mov` | 19 MB | 18 s · 2374 px | Circula UX |
| `prototype_process.mov` | 8.3 MB | 18 s · 1018 px | Reverie moodboard row |
| `nextscore_userflow1.mp4` | 7.4 MB | 81 s · 1468 px | NextScore UX |
| `nextscore_userflow2.mp4` | 2.5 MB | 27 s · 1468 px | NextScore UX |
| `splashscreen.mp4` | 576 KB | 5 s · 1468 px | NextScore visual design |

External embeds: 3 Figma prototype iframes (Circula ×1, Reverie ×2); Chart.js 4.4.1 from jsDelivr (Circula).
External links: resume on Google Drive, TikTok, LinkedIn.

### 3.2 Unused (not referenced by any HTML/CSS/JS)
| File | Size | Notes |
|---|---|---|
| `reverie_thumbnail3.png` | 13 MB | **untracked, new** — likely a v2 cover candidate? |
| `reverie_mockup2.png` | 9.0 MB | |
| `reverie_1.png` | 7.4 MB | |
| `reverie_mockup3.png` | 6.0 MB | |
| `reverie_mockup5.png` | 6.0 MB | |
| `reverie_mockup4.png` | 4.3 MB | |
| `0930.mp4` | 3.1 MB | 14 s · 1080p, unknown content |
| `Reverie_intro.png` | 2.2 MB | |
| `reverie_mockup.png` | 1.5 MB | |
| `Reverie_project1.png` | 1.3 MB | |
| `reverie_thumbnail.png` | 1.3 MB | old card cover |
| `circula_thumbnail.png` | 952 KB | **untracked, new** — likely a v2 cover candidate? |
| `MacBook Air - 1.png` | 600 KB | |
| `mainfeatures.png` | 452 KB | |
| `fourfunctions-japanese.png` | 436 KB | |
| `fourfunctions-english.png` | 404 KB | |
| `Screenshot1.png` | 64 KB | |
| `sus copy/sus-01…10.png` | ≈ 2 MB (10 files) | probably the SUS survey screenshots behind `sus-results-chart.js` |
| `Teamlab_CV.pdf` | — | tracked in git but **deleted** in the working tree |

### 3.3 Referenced but missing
| Path | Referenced from |
|---|---|
| `melbourne_branding_thumb.png` | index.html (Outside the Spotlight card 1) |
| `activist_branding_thumb.png` | index.html (card 2) |
| `shesaidk_thumb.png` | index.html (card 3) |

No other broken references. (The graphic-design and hackathon pages contain no images at all.)

---

## 4. Interactions in `script.js` (+ related)

### Keep (port to v2)
| v1 behaviour | Where | v2 home |
|---|---|---|
| EN/JA toggle persisted in `localStorage` (`i18n.js`) | all pages | Astro i18n routes + toggle (DESIGN §5.8). Keep the stored preference to redirect returning visitors. |
| Per-language images (4 swaps) | Reverie, NextScore | `Media` component with `src: { en, ja }` |
| Videos play only while centred in viewport, muted, `playsinline`, skipped under reduced motion (`initCirculaMutedViewportVideo`) | Circula | Generic `Media` video behaviour for **all** videos (DESIGN §7) |
| "Outside the Spotlight" expand/collapse with `aria-expanded` | Home | Replaced by the Side Quests shelf (DESIGN §5.11) |
| SUS chart: means computed from raw responses, reverse-scored items marked ✳, bilingual labels, reflow on resize | Circula | `SusChart` component. Data and labels carry over; consider a static SVG/HTML bar chart instead of Chart.js (~70 KB gz) to stay inside the JS budget |
| Nav gets `.scrolled` background after 50px | all | Nav blur after 40px + hide-on-scroll-down (DESIGN §5.7) |
| `.fade-up` IntersectionObserver reveals | case studies | GSAP text/paragraph/image reveal recipes (DESIGN §4.3) |
| Top scroll-progress bar | all | Case-study reading progress bar in `--accent` (DESIGN §5.5) |
| Hero title fade-up on load | Home | "KOSEI©" mask rise (DESIGN §5.2) |
| CSS "LET'S CONNECT" marquee (`@keyframes scroll`, 7 s) | footer | Velocity-aware marquee that pauses on hover/focus (DESIGN §5.9) |
| Floating fluid-sphere GIF (`gifFloat`) | Home | Lightweight canvas/CSS blob (DESIGN §5.2) |

### Drop
- Cursor-trail code (disabled; DESIGN forbids cursor trails).
- Card hover via inline styles (`translateY(-15px) scale(1.03) rotateX(2deg)` + box-shadow) → replaced by DESIGN hover-lift.
- Hero parallax + scroll-driven title colour fade — runs `console.log` **on every scroll frame** (performance bug).
- Dead code: `.contact-link` hovers, `.nav-toggle` menu, empty throttled scroll handler, `hero-cta`, global `transition: all` injected on every link/button.
- Custom anchor smooth-scroll (Lenis `anchors: true` replaces it).
- The blunt global reduced-motion override (replaced by DESIGN §4.5 per-pattern rules).

### Small v1 bugs worth not carrying over
- Circula visual design points use keys `design-2`, `design-1`, `design-3` in that order (labels are numbered to match, so it reads fine — just untidy keys).
- `<video>` elements list `.mov` as both `video/quicktime` and `video/mp4` sources.
- Reverie page file name / title / card alt still say "Social Media Campaign".

---

## 5. Migration plan → Astro (structure from CLAUDE.md)

> **Revised 2026-10-25 (Kosei):** v1 stays as-is in `koseifoliojp`, and v2 gets a **brand-new GitHub repo**.
> So nothing in this folder is moved or deleted. v2 *copies* the used assets out of here; the v1 site keeps deploying unchanged.

### Phase A — new repo + scaffold
1. New local folder next to this one (proposed `~/Desktop/portfolio-v2`), `git init`, branch `main`.
2. Copy `CLAUDE.md`, `DESIGN_portfolio.md` → `DESIGN.md`, `INSPIRATION.md`, `AUDIT.md` into it. Update CLAUDE.md's repo/`base`/branch lines for the new repo.
3. `npm create astro` (TypeScript strict) + GSAP, Lenis, MDX, Fontsource.
4. `astro.config`: `site: 'https://koseihamada30.github.io'`, `base: '/'` if the repo is `KoseiHamada30.github.io` (recommended — no user-site repo exists yet), else `base: '/<repo-name>'`.
5. `withastro/action` deploy workflow. Creating the GitHub repo and the first push happen only with your go-ahead.

### Phase B — v1 cleanup (optional, in *this* repo)
Only if you still want it: move the §3.2 unused files into `legacy/unused-assets/` here (they are not referenced, so the live v1 site is unaffected). Nothing else in v1 moves.

### Phase C — assets (copied into the new repo)
| Destination | Files |
|---|---|
| `src/assets/projects/circula/` | `circula_frontpic.png`, `circula_frontpage.png`, `Slide 4_3 - 1.png` (rename `circula-overview.png`), `circula_features.png`, `circula_screen.png` (+ `circula_thumbnail.png` if it's the new cover) |
| `src/assets/projects/reverie/` | `Reverie_title.png`, `reverie_thumbnail2.png`, `reverie_morning1.png`, `morning/nightroutine_mockup.png`, `morning/night_mockup4.png`, `moodboard.png`, `reverie_brainstorming.png`, `reverie-roadmap-english.png`, `reverie_function(_jp).png`, `emotional_scale.png`, `clock.png` |
| `src/assets/projects/nextscore/` | `nextscore_mockup.png`, `nextscore_thumbnail(_eng).png`, `nextscore_1.png`, `nextscore_project1.png`, `nextscore_features(_eng).png`, `googlescript.png` |
| `src/assets/info/` | `profile.JPG`, 6 personal photos, 5 tool logos |
| `public/videos/` | 8 used videos re-encoded to H.264 MP4 ≤1080p (+ poster frames). Originals stay in v1. **ffmpeg is not installed** (`brew install ffmpeg`) |
| `src/assets/sidequests/branding/` | Selected Honne Festa files from `~/Desktop/branding final/` + Brim CC pages exported from `Branding_assignment1.pdf` (see §7) |
| Not copied | `Fluid-sphere-unscreen.gif` (rebuilt in code), all §3.2 unused files, `0930.mp4` (old Reverie process video) |

Images go through `astro:assets` (AVIF/WebP + `srcset`), so the 13 MB / 8.6 MB PNGs become a few hundred KB each.

### Phase D — content
- `src/i18n/en.json`, `ja.json`: port UI strings (nav, footer, section labels, info page) **verbatim** from `i18n.js`; add keys for the hard-coded strings in §2.3.
- `src/content/projects/{circula,reverie,nextscore}.mdx`: frontmatter from §1 meta, body sections in v1 order, `{ en, ja }` text ported verbatim. `nba-research-lab.mdx` as `draft: true` with `TODO(kosei)` placeholders.
- `src/content/sidequests/`: honourable mentions, not full case studies — `branding-brim-cc.mdx`, `branding-honne-festa.mdx` (outline in §7), (SheSaidK dropped for now).
- Drop the 5 unused keys unless you want the Reverie onboarding flow back.

### Phase E — URLs
v1 keeps its own URLs (it stays live), so no redirects are needed. Update resume / LinkedIn links to the new site when you're ready.

### Section-order mapping (v1 → CLAUDE.md default)
| CLAUDE.md default | Circula | Reverie | NextScore |
|---|---|---|---|
| Overview | Hero + "What is this app?" | Hero + "What is this app?" | Hero + "What is this app?" |
| Challenge | 01 | 01 | 01 |
| Discovery | 02 | 02 | 02 |
| Research | 03 | 03 | 03 |
| UX flow | 06 | 06 | 06 |
| Visual design | 05 | 05 (+ 07 Vibe Coding) | 05 |
| Outcome / Review | 07 Ongoing research (SUS) | 08 Review | — |
| Next steps | 08 | 08 | 07 |

v1 puts "What is this app?" (04) after Research and Visual Design before UX flow — see open questions.

---

## 6. Decisions (Kosei, 2026-10-25)

| Topic | Decision |
|---|---|
| Language | English is the default at `/`; Japanese under `/ja/` |
| Repo | Keep v1 (`koseifoliojp`) live; v2 in a brand-new GitHub repo, local folder `~/Desktop/portfolio-v2`. Repo name: **`portfolio`** → `koseihamada30.github.io/portfolio/` |
| New covers | `circula_thumbnail.png` and `reverie_thumbnail3.png` are the v2 card covers |
| Unused media | **Done:** moved into `legacy/unused-assets/` in v1 (15 files + `sus copy/`, 46 MB; `git mv`, staged, not committed). `circula_thumbnail.png` and `reverie_thumbnail3.png` stay at the root as v2 covers. `0930.mp4` = old Reverie process video |
| Side quests | Honourable mentions, not full case studies: **Brim CC** and **Honne Festa** only. **SheSaidK is dropped** from v2 for now. Both branding projects were **solo**. Show **images only** (no PDF links), with one consistent interaction across both |
| NBA Research Lab | Content comes later from Kosei's other Claude session; `draft: true` until then |
| Section order | Claude's call → see below |
| Reverie team | Alex Zhang, Shun Fukui, Elaine Shi may be named |
| NextScore duration | **3 months** (replaces "3 weeks ~ current") |
| Footer email | `koseidama35@gmail.com` (replaces the student email) |
| Title | **Product Designer** everywhere (nav, `<title>`, meta) |
| Digital marketing | Removed from the portfolio entirely |
| Accents | NextScore = dark green from the splash screen; NBA Lab = Dimers yellow + blue |

### Accent colours (sampled)
| Project | `--accent` | Secondary | Source |
|---|---|---|---|
| Circula | `#F39237` | — | DESIGN.md |
| Reverie | `#1E3A8A` (night) | `#F07A3C` (morning) | DESIGN.md / moodboard |
| NextScore | `#24543C` (dark green glow) | `#1BC257` (UI green) | sampled from `nextscore_mockup.png` / `nextscore_1.png` splash + buttons (≈, 12-step buckets) |
| NBA Research Lab | `#1D4ED8` Dimers Blue | `#EFE300` Dimers Yellow | `Dimers Design System.zip` → SKILL.md |
| Brim CC (side quest) | `#8C1B1C` seal red | `#383838` | Brief 1 final palette |
| Honne Festa (side quest) | `#670000` ruby | `#C3B99D` beige | Brief 2B final palette |

Note: Dimers Yellow `#EFE300` on the paper background is far below 3:1, so it can only be a fill behind dark text or appear on dark surfaces, never a thin line or text on paper.

### Section order (Claude's call — to log in DECISIONS.md)
Overview (hero, meta, one-line "what it is") → Challenge → Discovery → Research → **Solution** (v1's "What is this app?", kept after research as the reveal) → UX flow → Visual design → Outcome / Review → Next steps.
- Reverie: "Vibe Coding" stays its own section, between Visual design and Review — it's the most distinctive part of that project.
- Circula: "Ongoing research" (SUS chart) becomes Outcome.

---

## 7. Branding side quest — outline of everything in `~/Desktop/branding final/`

University of Melbourne, **GDES30002** (branding subject), 2026. Three submissions = two projects.
These map to v1's two "Outside the Spotlight" cards.

### 7.1 Brief 1 — Brim CC rebrand (v1: "Branding Local Business in Melbourne")
Source: `Branding_assignment1.pdf` (22 pp, 13 MB). Also has a video presentation link on Google Drive (page 1).
1. **Problem** — Japanese organic café at 601 Little Collins St with almost no branding: one sign, three clashing typefaces, Facebook last updated 2020. Owner interview: "Brim CC" = Believe, Credit, Quality; "Mum's Kitchen" = his mother's cooking.
2. **Audit** — site photos; the customer note wall (multilingual notes, origami cranes) is the richest surface.
3. **Competitors** — Don Don (Francis St), Onsen Japanese.
4. **Strategy & concept** — make a Chinese owner's earned Japanese craft visible; a bilingual mark combining a Chinese seal stamp with Japanese calligraphy; "Mum's Kitchen" becomes the emotional centre.
5. **Brand story** — short narrative of a student finding the café.
6. **Stylescape** (3 directions) + **references**: Mirá bakery, Zoe Cui's *Women in Chinese Characters* (→ seal red), Studio Rejane Dal Bello, Japanese ryokan.
7. **Logo development** — 6 early concepts → 12-step refinement of the 母味 seal.
8. **Typography** — Made Tommy (primary), Ting Tong (secondary script), Hiragino Kaku Gothic (JP).
9. **Colour** — `#383838`, `#636565`, `#CCCCCC`, seal red `#8C1B1C`.
10. **Final logo** — horizontal + stacked seal, light + dark versions.
11. **Applications** — Instagram posts ("We are open", Katsu Karē Don), lightbox sign, menu, embossed business card.

**Assets:** only inside the PDF — no loose image files. Plan: export the final logo, the applications pages and one logo-development page as images.
⚠ The business card shows a phone number, and the PDF cover has a student number — crop or skip those.

### 7.2 Briefs 2A + 2B — Honne Festa 本音フェスタ (v1: "Branding Activist Movement")
**2A — research & strategy** (`Brief2A_branding.pdf`, 21 pp, 26 MB)
1. **Issue** — gender inequality in Japanese workplaces (WEF Global Gender Gap 2025: Japan 118th/148; 22% wage gap; dual career-track system).
2. **Existing movements** — #KuToo, Flower Demo, etc.books; W Society, Tokyo Pride.
3. **Positionality statement** — written as a Japanese man; accountability measures.
4. **Visual research** — Guerrilla Girls, Ni Una Menos, Marcha das Margaridas, Aurat March, Escape the Corset.
5. **Strategy** — positioning statement, joining/amplifying/filling a gap, audiences (business men → working women → students), political positioning, avoiding harm.
6. **Brand foundation** — the name *Honne* (true feelings) vs *tatemae* (public face) + *Festa*; vision, purpose, concept statement.

**2B — identity** (`Brief2B_final (2).pdf`, 32 pp, 30 MB)
1. Concept restatement, **positioning matrix** (corporate↔community × critical↔celebratory).
2. **Tone of voice** — "loud + engaging"; 3 principles with do/don't lines.
3. **Stylescapes** (3) + references: Experimental Jetset, Atelier Bundi, Noritake, Muji / Kenya Hara.
4. **Logo development** — workshop sketches → mouth/lips concept → wordmark + badge explorations.
5. **Final logo** — lips mark around HONNE FESTA + 本音フェスタ; colour, black/white, minimum-size wordmark.
6. **Typography** — Sofia Pro, Tsukushi A Maru Gothic, Inter, Anton (lanyards).
7. **Colour** — `#F5F4F2`, `#ADA9A8`, `#C3B99D`, `#670000`, `#2C2A2B`.
8. **Photography** — selective colour (one woman in colour in a grey office). **Illustration** — mouth mark in 4 variants; tagline "The words you couldn't say — say them here".
9. **Applications** — posters (「私の企画、上司の名前で提出された。」), wallet ticket, staff/media lanyards, Instagram grid, A-frame signage, T-shirts.
10. **Style guide** — minimum size, clear space, incorrect usage, type hierarchy, palette.

**Assets (31 loose files, all Honne Festa):** logos (`brandingfinal_logo*.png`), lips illustrations, posters (`Branding_brief2B_poster1.png`, `brandingB2_poster2.png`), mockups (`Street Poster2.png`, `postermockup1.png`, `Realistic ID Cards.png`, `digital_ticket.png`, `Frame 121.png`), wallet screens, stylescapes, `logo sketch/` (13 photos).
Don't use: `officepic.jpg` (stock photo), `wall-mockup.*` (empty template), the 2 `.psd` files.

### 7.3 Proposed presentation (honourable mention, not a case study)
- **Side Quests shelf:** one card per project — *Brim CC* and *Honne Festa*. Both use the same card and the same image interaction.
- **Each branding card opens a light single page** (or an expanding panel): a 2–3 sentence summary, a meta line (GDES30002 · 2026 · solo · brand identity), then a **horizontal process strip** — Research → Strategy → Sketches → Final logo → System (type + colour) → Applications — one image per step. No PDF links.
- No reading rail, no long text, no section numbers — that's what makes it read as "honourable mention" next to the three case studies.
- Copy: reuse v1's `graphic-design-*` EN/JA strings for the summaries. New wording comes from the PDFs (English only); JA versions TODO(kosei).
