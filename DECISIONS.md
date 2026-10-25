# DECISIONS.md

Design and build decisions not covered by DESIGN.md. Newest first.

| Date | Decision | Why |
|---|---|---|
| 2026-10-25 | Japanese webfonts (Shippori Mincho, Zen Kaku Gothic New) load only on `/ja/` pages via `<JaFonts />`. **Follow-up:** that CSS is still ~176 KB gzipped and render-blocking on `/ja/`; subset the fonts to the glyphs used, or load the stylesheet non-blocking, before the performance pass. | Loading them site-wide made every page's CSS ~193 KB gzipped, against a Lighthouse ≥ 90 target. |
| 2026-10-25 | Repo is `KoseiHamada30/portfolio`, so `base` = `'/portfolio'` (one constant, `REPO_BASE`, in `astro.config.mjs`). All links go through `url()` in `src/lib/i18n.ts`. | Kosei's choice; one place to change if a custom domain is added. |
| 2026-10-25 | Case-study section order: Overview → Challenge → Discovery → Research → Solution ("What is this app?") → UX flow → Visual design → Outcome / Review → Next steps. Reverie keeps "Vibe Coding" as its own section after Visual design; Circula's SUS "Ongoing research" becomes Outcome. | Kosei left the order to Claude. Keeps v1's research → reveal story while following CLAUDE.md's default. |
| 2026-10-25 | Reverie accent = night `#1E3A8A`, with morning `#F07A3C` as `--accent-2`. NextScore `#24543C` / `#1BC257`; NBA Lab Dimers Blue `#1D4ED8` / Yellow `#EFE300` (fills and dark surfaces only). Side quests: Brim CC `#8C1B1C`, Honne Festa `#670000` / `#C3B99D`. | Sampled from each project (AUDIT.md §6). Dimers Yellow fails contrast on paper. |
| 2026-10-25 | Added `--accent-2` token alongside DESIGN.md's `--accent`. | Reverie, NextScore, NBA Lab and Honne Festa each have a two-colour identity. |
| 2026-10-25 | New UI strings with no v1 translation (`site.role`, `site.description`, `nav.lang*`, `a11y.skip`, `home.placeholder`) were translated by Claude. `nav.contact` and `footer.resume` are ported verbatim from v1 `i18n.js`. | TODO(kosei): review the JA wording in `src/i18n/ja.json`. |
| 2026-10-25 | Removed the scaffold's `AGENTS.md`. | Duplicated by CLAUDE.md. |
| 2026-10-25 | Built on Astro 7.4 (latest stable). Zod is imported from `astro/zod` (the `astro:content` export is deprecated). | CLAUDE.md asks for latest stable. |
