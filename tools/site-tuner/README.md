# Site Tuner

The real built site inside a control panel, published as a Claude artifact
(https://claude.ai/artifact/BtiWRX3CqpNHCc2NgHvJFa). Design changes are reviewed here before anything ships.

    npm run build
    node tools/site-tuner/build.mjs dist <out>/site     # rewrites the /portfolio base, flattens pages, adds the bridge
    cp tools/site-tuner/tuner.html <out>/tuner.html      # then publish <out>/tuner.html with <out>/site/** as files

- `tuner-bridge.js` is injected first into every page. It applies the panel's CSS overrides, re-applies
  them after Astro page swaps, dispatches `tuner:css` (stage.ts re-reads its tokens on it) and reports
  Edit-text changes.
- Add a new page to `PAGES` in build.mjs and to `PAGES` in tuner.html.
