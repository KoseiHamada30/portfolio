# DESIGN.md — Kosei Hamada Portfolio v2

> Source of truth for visual + motion decisions. Claude Code must read this before building any UI.
> If something is not specified here, choose the most restrained option and note it in `DECISIONS.md`.

---

## 0. Concept — "Gallery wall"

The site shell is **black ink on warm paper**: quiet, editorial, typographic.
**The projects bring the colour.** Each case study gets one accent colour taken from its own product
(Circula orange, Reverie dusk blue, etc.), used only inside that case study.

Three words: **Editorial · Tactile · Calm.**
Motion should feel like turning pages of a well-made magazine, not like a game.

Evolves from v1: keeps the monochrome base, the italic serif headline voice, the `•` bullet links,
the "LET'S CONNECT" marquee and the fluid sphere idea. Upgrades: a real type scale, a motion system,
page transitions, richer case-study layouts, and consistent tokens.

---

## 1. Colour tokens

```css
:root {
  /* Ink (text, UI) */
  --ink-900: #0E0E0E;   /* primary text, dark surfaces */
  --ink-700: #2B2B2B;   /* secondary headings */
  --ink-500: #696969;   /* body-secondary, captions (≥4.5:1 on paper-100) */
  --ink-300: #A6A6A6;   /* decorative only — never body text */

  /* Paper (backgrounds) */
  --paper-0:   #FFFFFF; /* cards, media frames */
  --paper-100: #F6F5F2; /* page background (warm off-white, evolves v1 #f8f8f8) */
  --paper-200: #ECEAE5; /* subtle fills, hover backgrounds */
  --line:      #DEDBD5; /* hairlines, dividers */

  /* Inverted surfaces (footer, intro loader, cursor label) */
  --surface-inverse: var(--ink-900);
  --on-inverse:      var(--paper-100);

  /* Per-project accent — overridden on each case-study <body data-project="..."> */
  --accent:      var(--ink-900);
  --accent-soft: color-mix(in oklab, var(--accent) 12%, var(--paper-100));

  /* Focus */
  --focus-ring: 0 0 0 2px var(--paper-100), 0 0 0 4px var(--ink-900);
}

/* Project accents (sample from each project's real UI; adjust if needed) */
[data-project="circula"]   { --accent: #F39237; }
[data-project="reverie"]   { --accent: #1E3A8A; }   /* night palette; morning = #F07A3C */
[data-project="nextscore"] { --accent: var(--ink-900); } /* TODO: sample from NextScore UI */
[data-project="nba-lab"]   { --accent: var(--ink-900); } /* TODO: sample from NBA Research Lab work */
```

Rules
- Body text is always `--ink-900` or `--ink-500`. Accent never carries body text.
- Accent is used for: progress bar, active section index, small highlights, selection colour, hover underline in that case study.
- One inverted (dark) band per page max: the footer / connect section.
- Optional dark mode: invert ink/paper tokens only; accents stay. Ship light first.

---

## 2. Typography

| Role | Latin | Japanese | Notes |
|---|---|---|---|
| Display / headlines | **Instrument Serif** (regular + italic) | **Shippori Mincho** (500) | Evolves v1 Lora italic. Italic for emphasis words. |
| UI / body | **Inter** (variable) | **Zen Kaku Gothic New** (400/500) | Evolves v1 Inter. |
| Labels / meta / index numbers | **Geist Mono** | — (fall back to Zen Kaku Gothic New) | Uppercase, tracked. |

Self-host via Fontsource (`@fontsource-variable/inter`, `@fontsource/instrument-serif`, etc.) with `font-display: swap`; preload only the display face used above the fold.

Fluid type scale
```css
:root {
  --fs-hero:    clamp(4.5rem, 14vw, 13rem);  /* "KOSEI©" */
  --fs-display: clamp(2.75rem, 6.5vw, 6rem); /* page titles, case-study title */
  --fs-h1:      clamp(2rem, 4vw, 3.5rem);
  --fs-h2:      clamp(1.5rem, 2.6vw, 2.25rem);
  --fs-h3:      1.25rem;
  --fs-body-lg: 1.125rem;
  --fs-body:    1rem;
  --fs-small:   0.875rem;
  --fs-label:   0.75rem;

  --lh-tight: 0.95;   /* hero / display */
  --lh-head:  1.1;
  --lh-body:  1.6;    /* Latin */
  --lh-body-ja: 1.9;  /* Japanese needs more leading */

  --tracking-hero: -0.04em;
  --tracking-head: -0.02em;
  --tracking-label: 0.08em;
}
```

Rules
- Max line length: 68ch (Latin), 38em-ish / ~36 full-width chars (Japanese).
- Japanese: `line-break: strict; word-break: keep-all; overflow-wrap: anywhere;` use `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- Never letter-space Japanese text. Never italicise Japanese (switch to Mincho for emphasis instead).
- Labels: Geist Mono, `--fs-label`, uppercase, `--tracking-label`, `--ink-500`. Format: `(01)`, `(App design)`, `2025 —`.
- Superscript counters in nav kept from v1: `Work¹  Info²`.

---

## 3. Space, grid, shape

```css
:root {
  /* 4px base */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;
  --space-9: 96px; --space-10: 128px; --space-11: 192px;

  --section-gap: clamp(96px, 14vw, 192px);
  --page-margin: clamp(16px, 4vw, 64px);
  --gutter: clamp(16px, 2vw, 32px);
  --max-width: 1440px;
  --text-width: 68ch;

  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-pill: 999px;

  --shadow-lift: 0 1px 2px rgb(0 0 0 / .04), 0 12px 32px -12px rgb(0 0 0 / .18);
}
```

- 12-column grid desktop, 6 tablet, 4 mobile. Breakpoints: 640 / 1024 / 1440.
- Images and video: `--radius-md`. Pills and buttons: `--radius-pill`.
- Hairlines (`1px solid var(--line)`) separate list rows and sections, no heavy borders, few shadows.

---

## 4. Motion system

### 4.1 Principles
1. **Motion explains, then gets out of the way.** Every animation must show hierarchy, continuity or feedback.
2. **One hero moment per page.** Everything else is subtle.
3. **Frequency rule.** Things used constantly (nav, language toggle, hovers) are fast or not animated; rare moments (intro, page transition) can be expressive.
4. **Only `transform`, `opacity`, `clip-path`, `filter: blur(<8px)`.** Never animate layout properties.
5. **Exit faster than enter.**
6. **Interruptible.** Hovers use CSS transitions, not keyframes.

### 4.2 Tokens
```css
:root {
  --ease-out:      cubic-bezier(0.23, 1, 0.32, 1);  /* UI enter, hovers          ≈ GSAP "power4.out" */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* reveals, page-in         ≈ "expo.out"    */
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);  /* on-screen movement, curtain ≈ "power3.inOut" */
  /* linear: marquees, progress bars, scrubbed scroll */

  --dur-instant: 100ms;  /* press feedback */
  --dur-fast:    180ms;  /* hovers, toggles, tooltips */
  --dur-base:    280ms;  /* menus, small UI */
  --dur-slow:    500ms;  /* image hovers, drawers */
  --dur-reveal:  900ms;  /* text/image scroll reveals */
  --dur-page:    1000ms; /* page transition total */

  --stagger-text: 40ms;  /* per line / word */
  --stagger-item: 80ms;  /* per card */
}
```
Register the same values in JS (`src/lib/motion.ts`) and with GSAP `CustomEase` so CSS and GSAP match.

### 4.3 Patterns (standard recipes)
| Pattern | Spec |
|---|---|
| Text reveal (headings) | SplitText by lines, each line in an overflow-hidden mask, `yPercent: 110 → 0`, `--dur-reveal`, `expo.out`, stagger `--stagger-text`. Trigger at `top 85%`, once. |
| Paragraph reveal | `opacity 0 → 1`, `y: 16px → 0`, 700ms, `expo.out`. |
| Image reveal | `clip-path: inset(12% 12% 12% 12% round var(--radius-md)) → inset(0 round var(--radius-md))` + inner image `scale 1.12 → 1`, 1100ms, `expo.out`. |
| Parallax | Inner media `yPercent: -6 → 6`, scrubbed. Max ±8%. Desktop only. |
| Hover lift (cards) | Image `scale 1 → 1.03` 500ms `--ease-out`; title underline grows from left 280ms. |
| Press | `:active { transform: scale(0.97) }` 100ms. |
| Magnetic | Buttons follow pointer by 0.25× offset within 80px radius, release `elastic.out(1, 0.4)` 600ms. Pointer-fine only. |
| Counter | Numbers (SUS score, stats) count up over 1200ms `power2.out` when in view. |
| Marquee | Linear, ~40px/s, speed and direction follow scroll velocity (clamped 0.5×–3×). Pauses on hover and under reduced motion. |

### 4.4 Smooth scroll
- Lenis: `lerp: 0.1`, `anchors: true`, driven by `gsap.ticker` (`autoRaf: false`), `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`.
- Disabled entirely when `prefers-reduced-motion: reduce`.
- Must be destroyed and recreated on Astro navigation (see CLAUDE.md lifecycle rules).

### 4.5 Reduced motion
`prefers-reduced-motion: reduce` means: no Lenis, no parallax, no marquee movement, no SplitText movement.
Reveals become 200ms opacity fades. Page transitions become a 150ms crossfade. The intro loader is skipped.
Videos do not autoplay; show poster + play button.

---

## 5. Signature interactions

Build these, in this priority order. Each must work with keyboard and touch, and degrade under reduced motion.

1. **Shared-element page transition.** Clicking a project card expands its thumbnail into the case-study hero (Astro `transition:name="cover-{slug}"`). Other content fades and slides 24px. Back navigation reverses it.
2. **Hero "KOSEI©".** Letters rise from a mask on load (stagger 40ms). Behind: the fluid sphere, rebuilt as a lightweight canvas/CSS gradient blob (no 2MB GIF) that drifts slowly and leans toward the cursor (max 20px).
3. **Work index with list ↔ grid toggle.** Default: large editorial grid. Toggle to a dense list (index number, title, category, year). In list mode, hovering a row shows a cursor-following preview image (lerp 0.15, slight rotation from velocity). Switching views uses GSAP Flip.
4. **Contextual cursor** (pointer-fine only). 8px ink dot with `mix-blend-mode: difference`. Grows to a 72px pill labelled "View" / "Play" / "Drag" / "Copy" over relevant elements. Hidden on touch and reduced motion. Never hides the native focus ring.
5. **Case-study reading rail.** Sticky left rail on desktop listing sections `(01) Challenge … (07) Next steps`. The active item uses `--accent`, and a thin top progress bar shows reading progress. Collapses to a top dropdown on mobile.
6. **Pinned user-flow scroller.** In case studies, the "UX flow" section pins and scrolls phone screens horizontally while captions swap. Mobile: native horizontal snap scroll instead.
7. **Nav behaviour.** Hides on scroll down and returns on scroll up. The pill indicator slides between Work¹ and Info². Blurred paper backdrop after 40px scroll.
8. **Language toggle EN ⇄ JP.** Text swaps with a 180ms crossfade (or ScrambleText on the toggle label only). Choice persists.
9. **Footer.** Velocity-aware "LET'S CONNECT" marquee. Clicking the email copies it and shows a "Copied ✓" toast for 1.6s. A live Melbourne time label (`MEL 15:36`).
10. **Next-project handoff.** The end of each case study shows the next project's title at display size. Scrolling or clicking it plays the page transition.
11. **Side Quests shelf.** A horizontal, draggable shelf (GSAP Draggable + Inertia, plus native scroll/keyboard fallback) of smaller cards for the branding assignment(s) and hackathon.
12. **First-visit intro (optional, last).** Paper screen, mono counter 00→100, the name slides up, and the curtain lifts. ≤1.6s total, once per session, skipped on click or keypress.

Do NOT build: scroll-jacking that hijacks reading speed, cursor trails, sounds that autoplay, 3D WebGL scenes, or anything that delays content for over 1.6s.

---

## 6. Components

| Component | Notes |
|---|---|
| `Nav` | Brand (name + "Product Designer"), pill (Work¹ / Info²), lang toggle, `• Contact` CTA. |
| `Hero` | Display name, one-line intro (EN/JP), scroll cue. |
| `ProjectCard` | Cover (16:10 desktop, 4:5 mobile), title — subtitle, `(Category)` label, year. `transition:name` on cover. |
| `ProjectRow` | List-mode row: `(01)` · title · category · year, hairline divider. |
| `SideQuestCard` | Smaller card, square cover, tag chip. |
| `CaseHero` | Title, subtitle, cover, meta grid (Role · Team · Duration · Tools · Year). |
| `MetaGrid` | 2–5 cols of label/value pairs, mono labels. |
| `Section` | `(0n)` mono number + serif title + content slot; registers itself in the reading rail. |
| `Media` | Image / video, caption, optional `frame="phone|laptop|none"`, lazy, poster for video. |
| `FlowScroller` | Pinned horizontal screens + captions. |
| `Stat` | Big number + label (counter animation). |
| `Quote` | User-research quote, serif italic, attribution label. |
| `BeforeAfter` | Drag-to-compare slider (keyboard accessible). |
| `Callout` | "Insight" / "Decision" box on `--accent-soft`. |
| `NextProject` | Large handoff link. |
| `Button` / `LinkBullet` | `• Label` text links (v1 signature) and pill buttons. Magnetic on pointer-fine. |
| `Toast` | Small inverse pill, bottom centre. |
| `Footer` | Marquee, email-copy, resume, socials, Melbourne clock, © year (auto). |

---

## 7. Accessibility & quality bars

- WCAG 2.2 AA contrast. Visible focus ring (`--focus-ring`) on every interactive element. Skip link.
- All motion respects §4.5. Nothing auto-moves for longer than 5s without a pause control (the marquee pauses on hover/focus).
- Semantic headings: one `h1` per page. Images get real `alt` text (EN + JP).
- Touch targets ≥ 44px.
- Performance: LCP < 2.5s, CLS < 0.05, INP < 200ms on mid-range mobile. Lighthouse Performance ≥ 90, Accessibility 100.
- JS budget: ≈ 120KB gzipped total (GSAP + plugins + Lenis + app code). Load SplitText/Flip/Draggable only on pages that use them.
- Media: images through `astro:assets` (AVIF/WebP, responsive `srcset`). Videos re-encoded to H.264 MP4 (+ optional WebM), max 1080p and target < 6MB each, with `poster`, `muted playsinline loop`, played only in view.
