# DECISIONS.md

Design and build decisions not covered by DESIGN.md. Newest first.

| Date | Decision | Why |
|---|---|---|
| 2026-10-26 | `/lab` and `/styleguide` are internal pages: built and deployed, but `noindex`, not linked from the site, English only, and their demo copy is inline (exempt from the "all strings in i18n JSON" rule). | They're dev tooling for checking motion and tokens, not portfolio content. |
| 2026-10-26 | Reveal start states (opacity 0) apply only under `html.js`; the class is set by an inline head script and re-added on `astro:after-swap`, because ClientRouter resets `<html>` attributes. | Content stays visible if JS fails, without a flash of unrevealed content when it works. |
| 2026-10-26 | SplitText is lazy-loaded through a `beforePage()` hook only when the page has `data-reveal="lines"`; the lifecycle awaits it together with `document.fonts.ready` before any ScrollTrigger is created. | DESIGN.md §7: load SplitText only where used; CLAUDE.md: no ScrollTriggers before SplitText. |
| 2026-10-26 | Reduced motion: line, fade and image reveals become a 200ms opacity fade (no split, no clip-path); counters show their final value; parallax, magnetic and marquee movement are off; Lenis is off. | DESIGN.md §4.5. |
| 2026-10-26 | Magnetic radius is measured from the element's edge, not its centre. | Same 80px field for small and wide buttons. |
| 2026-10-26 | Marquee speed factor = 1 + \|scroll velocity\| / 600, clamped 0.5×–3×, eased back to 1× after scrolling; direction follows scroll direction. | DESIGN.md §4.3 gives the clamp, not the curve. |
| 2026-10-26 | `npm run check:motion` (Playwright, `scripts/check-motion.mjs`) runs the leak and reduced-motion checks against the dev server. It relies on a dev-only `window.__motion` hook. Set `PW_CHROMIUM` to use an already-installed Chromium instead of `npx playwright install`. | Repeatable version of the CLAUDE.md checklist items. |
| 2026-10-25 | Japanese webfonts (Shippori Mincho, Zen Kaku Gothic New) load only on `/ja/` pages via `<JaFonts />`. **Follow-up:** that CSS is still ~176 KB gzipped and render-blocking on `/ja/`; subset the fonts to the glyphs used, or load the stylesheet non-blocking, before the performance pass. | Loading them site-wide made every page's CSS ~193 KB gzipped, against a Lighthouse ≥ 90 target. |
| 2026-10-25 | Repo is `KoseiHamada30/portfolio`, so `base` = `'/portfolio'` (one constant, `REPO_BASE`, in `astro.config.mjs`). All links go through `url()` in `src/lib/i18n.ts`. | Kosei's choice; one place to change if a custom domain is added. |
| 2026-10-25 | Case-study section order: Overview → Challenge → Discovery → Research → Solution ("What is this app?") → UX flow → Visual design → Outcome / Review → Next steps. Reverie keeps "Vibe Coding" as its own section after Visual design; Circula's SUS "Ongoing research" becomes Outcome. | Kosei left the order to Claude. Keeps v1's research → reveal story while following CLAUDE.md's default. |
| 2026-10-25 | Reverie accent = night `#1E3A8A`, with morning `#F07A3C` as `--accent-2`. NextScore `#24543C` / `#1BC257`; NBA Lab Dimers Blue `#1D4ED8` / Yellow `#EFE300` (fills and dark surfaces only). Side quests: Brim CC `#8C1B1C`, Honne Festa `#670000` / `#C3B99D`. | Sampled from each project (AUDIT.md §6). Dimers Yellow fails contrast on paper. |
| 2026-10-25 | Added `--accent-2` token alongside DESIGN.md's `--accent`. | Reverie, NextScore, NBA Lab and Honne Festa each have a two-colour identity. |
| 2026-10-25 | New UI strings with no v1 translation (`site.role`, `site.description`, `nav.lang*`, `a11y.skip`, `home.placeholder`) were translated by Claude. `nav.contact` and `footer.resume` are ported verbatim from v1 `i18n.js`. | TODO(kosei): review the JA wording in `src/i18n/ja.json`. |
| 2026-10-25 | Removed the scaffold's `AGENTS.md`. | Duplicated by CLAUDE.md. |
| 2026-10-25 | Built on Astro 7.4 (latest stable). Zod is imported from `astro/zod` (the `astro:content` export is deprecated). | CLAUDE.md asks for latest stable. |
