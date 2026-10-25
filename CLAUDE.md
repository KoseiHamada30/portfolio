# CLAUDE.md — Portfolio v2 (Kosei Hamada)

Personal product-design portfolio of Kosei Hamada, Product Designer. Bilingual (English default / Japanese under `/ja/`).
This is the v2 repo, built in Astro. The v1 static site stays live, untouched, in the separate repo `KoseiHamada30/koseifoliojp`
(local: `~/Desktop/Professional portfolio`). `AUDIT.md` inventories v1 content, assets and decisions — read it before content work.
**Read `DESIGN.md` before any UI work. Read `INSPIRATION.md` when choosing interaction details.**

## Working rules
- **Plan first.** For every task with more than one step, show a short plan and wait for my OK before editing.
- **Ask, don't assume.** If content, copy or a design decision is unclear, ask me. Never invent project facts, metrics, quotes, clients or results. Use `TODO(kosei): …` placeholders instead.
- **Don't delete or overwrite** existing files (especially the v1 site, images and videos) without listing the paths and getting approval. Copy assets from v1; never modify the v1 folder unless I ask.
- **Git.** Default branch is `main`, which will auto-deploy to GitHub Pages once the remote exists. Don't create the GitHub repo, add a remote, or push unless I ask.
- Log any design decision not covered by DESIGN.md in `DECISIONS.md` (date, decision, why).
- After each phase: run `npm run build`, fix errors, then give me a 3-line summary and what to check in the browser.

## Stack
- Astro (latest stable) + TypeScript (strict). Static output.
- GSAP (all plugins are free: ScrollTrigger, SplitText, Flip, Draggable, InertiaPlugin, CustomEase, ScrambleText).
- Lenis for smooth scroll.
- Plain CSS with custom properties (tokens from DESIGN.md) + Astro scoped styles. No Tailwind, no UI kits.
- Content: Astro content collections + MDX for case studies.
- Fonts: Fontsource packages, self-hosted.
- Deploy: GitHub Pages via `withastro/action`. Repo `KoseiHamada30/portfolio` → `site: 'https://koseihamada30.github.io'`, `base: '/portfolio'` (change to `'/'` only if a custom domain is added). The value lives in one constant, `REPO_BASE`, in `astro.config.mjs`. All internal links and asset paths must respect `base` (use `import.meta.env.BASE_URL` / the `url()` helper in `src/lib/i18n.ts`).

## Structure (target)
```
src/
  styles/        tokens.css, base.css, typography.css, motion.css
  lib/           motion.ts (eases, durations, CustomEase), lenis.ts, transitions.ts, cursor.ts, i18n.ts
  components/    Nav, Hero, ProjectCard, ProjectRow, SideQuestCard, CaseHero, MetaGrid, Section,
                 Media, FlowScroller, Stat, Quote, BeforeAfter, Callout, NextProject, Footer, Toast, Cursor
  layouts/       BaseLayout.astro, CaseStudyLayout.astro
  content/
    projects/    circula.mdx, reverie.mdx, nextscore.mdx, nba-research-lab.mdx
    sidequests/  branding-brim-cc.mdx, branding-honne-festa.mdx   (honourable mentions; images only)
  i18n/          en.json, ja.json (UI strings)
  pages/         index, info, work/[slug], (ja/ mirrors)
  assets/        images (processed by astro:assets)
public/          videos (compressed), favicons, og images
```

## Content model (frontmatter)
```ts
title, slug, order, tier: 'spotlight' | 'sidequest',
subtitle: { en, ja }, category: { en, ja }, year, role, team, duration, tools: string[],
accent: string (hex), cover: image, coverVideo?: string, summary: { en, ja }, draft?: boolean
```
Case-study body in MDX using the components in DESIGN.md §6. Section order (default):
Overview → Challenge → Discovery → Research → UX flow → Visual design → Outcome / Review → Next steps.

## i18n
- Astro i18n routing: default locale `en` at `/`, Japanese under `/ja/`.
- Every visible string comes from `src/i18n/*.json` or from `{ en, ja }` frontmatter fields. No hard-coded copy in components.
- Port the existing translations from v1 `i18n.js`. Don't re-translate them.
- `<html lang>` must match the page. Japanese typography rules: DESIGN.md §2.

## Animation lifecycle rules (important with Astro ClientRouter)
- Use `<ClientRouter />` in BaseLayout.
- Bundled scripts run once, so init all motion inside `document.addEventListener('astro:page-load', init)`.
- On `astro:before-swap`, kill everything: `ScrollTrigger.getAll().forEach(t => t.kill())`, revert SplitText instances, `gsap.context().revert()`, `lenis.destroy()`, remove listeners.
- Use `gsap.context()` / `gsap.matchMedia()` per page so cleanup is one call. Put reduced-motion and pointer-fine branches in `matchMedia`.
- Lenis drives through `gsap.ticker`; call `ScrollTrigger.refresh()` after fonts load (`document.fonts.ready`) and after images in pinned sections load.
- Never create ScrollTriggers before SplitText has run, or the pin positions will be wrong.

## Quality checklist (run before saying a phase is done)
- [ ] `npm run build` passes, no TS errors, no console errors
- [ ] Works at 375px, 768px, 1280px, 1920px
- [ ] Keyboard-only navigation works and focus is visible
- [ ] `prefers-reduced-motion` behaviour matches DESIGN.md §4.5
- [ ] Navigating back and forth 5× creates no duplicate ScrollTriggers or memory leaks
- [ ] EN and JP both render; no missing keys
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility 100
