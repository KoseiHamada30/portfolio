# Update: photoyoshi-style home, splash, transitions and About loop

**Reference:** https://photoyoshi.com (see `references/photoyoshi-splash.png` and `references/photoyoshi-fullmode.png`)
**Status:** Phases 0–4 are done. This file **replaces Phase 4 (rework) and Phases 5, 9, 10, 11** of `20261025_prompts.md`.
Phases 6, 7, 8 and 12 stay the same. Paste the prompts below in order.

---

## 1. What photoyoshi actually does (observed)

| Moment | Behaviour |
|---|---|
| **Splash** | Warm paper background (#F1EFE7). Full-width heavy grotesk wordmark at top, letters rolling vertically into place one by one. A small portrait image in the centre that cycles quickly through photos. Thin `+` crosshair marks at the left and right thirds. Bottom row: katakana label (left), one-line bio (centre), a big **load counter 0→100** (right). At 100 the centre image scales up and a **paper sheet slides up from the bottom** to cover everything, then the gallery appears. |
| **Work, "full mode"** | Background switches to charcoal (#232323). A **horizontal slider**: one large portrait image in the centre, in full colour. Neighbouring images sit dimmed in **monochrome** and gain colour on hover. Big white grotesk title on top of the centre image (`Landscape⁽²⁰⁾` / `/116Photos`). Crosshair cursor. Grid/full toggle icons bottom-right. Built with three.js + GSAP (WebGL). |
| **Open a photo** | The detail page **slides up from the bottom** over the gallery. Top-right `Close` slides it back down. Meta label: `CATEGORY / Landscape`. |
| **About** | Portrait sticky on the left half. Bio, contacts, Profiles and Awards tables on the right fade in as they enter. **The bottom of About becomes the splash composition**: wordmark + small centre image + counter. Scrolling **scrubs the counter 0→100 and grows the image**. At 100 the URL changes to Work and the splash's exit sequence plays, so About runs straight into Work. |

### How we adapt it (patterns, not a clone)
- No copying of their name, katakana logo, photos or text. Your wordmark is **KOSEI HAMADA** (or `KOSEI©`), and your images are your **project covers**.
- **Default view = the large horizontal slider.** The "many small images" curved grid is dropped. The optional second view is a clean **text index list**, not tiny thumbnails.
- Slider items = case studies (Circula, Reverie, NextScore, NBA Research Lab), then Side Quests labelled `Side quest`.
- **Build the slider in plain DOM + GSAP first** (lighter, accessible, easier to maintain). The WebGL shader version (colour spreading from the cursor, velocity ripple) is an optional upgrade in Phase 4R-c.

---

## 2. DESIGN.md addendum (Claude Code merges this in Phase 4R-0)

```md
## 8. v2.1 direction: "Stage & Sheet" (photoyoshi-inspired)

### 8.1 Colour additions
--stage:        #232323;  /* Work slider background (dark stage) */
--stage-ink:    #EDEBE4;  /* text on stage */
--stage-dim:    rgb(0 0 0 / .45); /* overlay on inactive slides */
--sheet:        var(--paper-100); /* the sliding page sheet */
Inactive slide image: filter: grayscale(1) brightness(.55) contrast(1.05)
Hovered inactive slide: grayscale(0) brightness(.8), 500ms --ease-out
Active slide: full colour, no filter.

### 8.2 Typography change
Wordmark + slide titles: heavy grotesk, tight.
  - Default (free): "Inter Tight" 700–800, tracking -0.055em, line-height .82
  - If Kosei has Adobe Fonts: "Neue Haas Grotesk Display" 65/75 (kit, self-host not allowed; use Adobe embed)
Wordmark size: fills the viewport width minus page margins (fit-text via JS or clamp(5rem, 15.5vw, 16rem)).
Slide title: clamp(3rem, 6.5vw, 6.5rem), superscript count in mono e.g. ⁽⁰¹⁾, subline `/App design` in Inter 500.
Instrument Serif italic is kept only for small editorial accents inside case studies.
Japanese label row: Zen Kaku Gothic New 400, 11–12px, e.g. 「プロダクトデザイナー［•］ハマダコウセイ」 (Kosei to confirm wording).

### 8.3 Cursor (pointer-fine only)
- Default: 15px thin crosshair "+" (1px strokes, currentColor, mix-blend-mode: difference), follows with lerp .18.
- Static decorative "+" marks at 1/6 and 5/6 of the viewport width on splash and About-end.
- Over the active slide: crosshair expands to a label pill "View" (or "Drag" while dragging).
- Over inactive slides: label "Prev" / "Next" depending on side.
- Native cursor hidden only inside the slider stage; keyboard focus ring always visible.

### 8.4 Motion recipes (replace §5.1, 5.2, 5.3, 5.10, 5.12)
| Moment | Recipe |
|---|---|
| Letter roll | Each wordmark letter is a vertical strip of 3–4 glyph copies in an overflow-hidden box; translate from yPercent 100 → 0 (or cycle), stagger 50ms, 900ms expo.out. |
| Splash centre image | Cycles project covers every 140ms while loading (stop at the first project). |
| Load counter | Real asset progress (fonts + first 4 covers), tweened so it never jumps backwards, min 1.2s, max 2.4s. |
| Splash exit | Centre image scale 1 → 1.25 (600ms, power3.inOut) while the --sheet panel slides from yPercent 100 → 0 (800ms, expo.inOut), background switches to --stage, sheet slides off upward, slider items rise in (stagger 60ms). |
| Slider | Wheel / drag / arrow keys drive a target index; position lerps (0.09). Velocity adds a subtle skewX (max 4°) and inactive scale .92. Infinite loop. Snaps to nearest slide after 150ms idle. |
| Open case study | Click active slide → --sheet rises from the bottom (yPercent 100 → 0, 900ms expo.inOut) carrying the case-study hero; slider fades to 0.4 behind it. |
| Close | Top-right "Close" → sheet slides down (650ms, power3.in-ish but fast), slider reappears on the same slide (index kept in sessionStorage + ?p=slug). |
| About → Work | Last section of About = splash composition. ScrollTrigger scrub maps progress 0→1 to counter 0→100 + image scale .5→1.4. At 1 (and after 300ms of no reverse scroll), navigate to Work with `?from=about`, and Work plays only the splash exit. |

### 8.5 Reduced motion / touch / no-JS
- Reduced motion: no letter roll, no counter animation (just show 100), no sheet slide (150ms fade), slider jumps without skew, About→Work becomes a normal "Go to Work →" link.
- Touch: native horizontal swipe with scroll-snap (no custom cursor); tap active slide to open.
- No JS: slider renders as a horizontal scroll-snap list of links; splash is skipped.
- Splash shows once per session (sessionStorage); later visits go straight to the slider. "Skip" on any key/click.
```

---

## 3. Prompts

> Before you start: put the two reference screenshots into `references/`. If you can, also screen-record the splash, opening a photo and the About ending, then export 6–10 frames of each as PNG (QuickTime → File → Export, or ask Claude Code to extract frames with ffmpeg). Claude Code can see images, but it can't watch videos.

### Phase 4R-0: Update the design system
```
I'm changing direction for the home and navigation, inspired by photoyoshi.com.
Read 20261025_portfolio-v2-prompt-pack/20261101_photoyoshi-update.md (sections 1 and 2) and the images in references/.
1. Merge section 2 ("DESIGN.md addendum") into DESIGN.md as §8. Where it conflicts with §5, mark the old items
   "superseded by §8" (don't delete them).
2. Log the direction change in DECISIONS.md.
3. Look at the current home page (Phase 4 output) and list what can be reused vs. what must change.
   Show me the plan and wait for my OK. Don't copy photoyoshi's name, logo, photos or text.
Ask me: (a) wordmark text: "KOSEI HAMADA" or "KOSEI©"? (b) display font: Inter Tight (free) or Neue Haas via
my Adobe Fonts? (c) the Japanese label line wording.
```

### Phase 4R-a: Splash screen
```
Build the splash (DESIGN.md §8.4, §8.5) as a Splash component on the Work page:
- Paper background, full-width heavy grotesk wordmark with the letter-roll intro.
- Centre image that cycles through my project covers while loading.
- Decorative thin "+" marks at 1/6 and 5/6 width.
- Bottom row: JP label (left), one-line intro (centre, EN/JP), load counter 0→100 (right, tabular numbers).
- The counter reflects real loading of fonts + first covers (min 1.2s, max 2.4s).
- Exit: image scales up while the paper sheet slides up from the bottom, background becomes --stage, slider rises in.
- Once per session, skippable with click/any key, skipped for reduced motion and no-JS.
- Make the splash composition a reusable component (we reuse it at the end of About later),
  with a `progress` prop so it can be driven by loading OR by scroll.
Make sure the hero/slider is already in the DOM underneath so LCP isn't delayed. Run the build and tell me what to check.
```

### Phase 4R-b: Horizontal stage slider + cursor (replaces the old Work grid)
```
Replace the home work grid with the dark "stage" slider from DESIGN.md §8:
- Items: Circula, Reverie, NextScore, NBA Research Lab (from content collection, ordered), then Side Quests with a
  "Side quest" label.
- Centre slide: large portrait-ratio cover (≈ 70vh tall) in full colour; neighbours visible left/right, monochrome
  and dimmed; hovering a neighbour fades its colour in.
- Big title over the centre slide: "Circula⁽⁰¹⁾" with "/App design" (EN/JP) underneath; titles crossfade/roll
  when the active slide changes.
- Input: wheel (vertical wheel moves horizontally), drag with inertia, arrow keys, and clickable neighbours. Infinite
  loop, velocity skew (max 4°), snap after idle. Plain DOM + GSAP (no WebGL yet). Use transforms only.
- Contextual crosshair cursor per §8.3 (View / Prev / Next / Drag labels). Pointer-fine only.
- Bottom-right: view toggle between "Stage" (default) and "Index" (a clean text list of projects:
  number, title, category, year; hover shows a monochrome→colour preview). No small-thumbnail grid.
- Nav: logo left, "Work, About" right with underline on the active one, plus EN/JP and Contact. Nav text colour
  adapts to stage (light) vs paper (dark).
- Accessibility: the slider is a list of links with aria-roledescription="carousel", live region announcing
  "Project 2 of 6: Reverie", visible focus, and full keyboard support.
- Touch: native scroll-snap swipe, tap to open. Reduced motion per §8.5.
Check the feel against references/photoyoshi-fullmode.png and tell me what's different.
```

### Phase 4R-c (optional, later): WebGL upgrade
```
Only if the DOM slider performs well and I approve: re-implement the slide images in WebGL using OGL (not full
three.js, to keep size small) with a shader that (1) renders inactive slides grayscale, (2) blooms colour outward
from the cursor position on hover, (3) adds a subtle velocity-based wave distortion while dragging.
Keep the DOM version as the fallback (no WebGL, reduced motion, low-power devices). Stay within the JS budget
in DESIGN.md §7 and lazy-load the WebGL code after the splash.
```

### Phase 5 (revised): Case-study template + sheet page (pilot: Circula)
```
Create CaseStudyLayout.astro and the MDX components (DESIGN.md §6): CaseHero, MetaGrid, Section, Media,
FlowScroller, Stat, Quote, BeforeAfter, Callout, NextProject, plus the sticky reading rail and progress bar.
The case study is a paper "sheet" page: top-right "Close" (returns to the slider at the same project), meta label
like "CATEGORY / App design" in the photoyoshi style, the cover at the top in full colour, and the big grotesk title.
Migrate circula.html → src/content/projects/circula.mdx, keeping every section, image, video and translation
(SUS chart rebuilt as an accessible Stat/bar component with count-up). data-project="circula" for the accent.
Videos play only when centred in the viewport (keep the v1 behaviour).
Don't build the slide-up transition yet (that's Phase 10). Just make the page and the Close link work.
```

### Phase 9 (revised): About page that flows into Work
```
Rebuild info.html as /about (keep /info redirecting to /about) using my v1 content: greeting, About me,
Experience (add Cipher – NBA Research Lab internship; ask me for dates/title), Skills, Tools, "Who I am" photos.
Layout like photoyoshi's About: my portrait sticky on the left half (subtle parallax), content on the right, with
two-column tables (year | item) for Experience and Education, plus EMAIL / LINKEDIN / RESUME rows. Rows fade in
as they enter.
Ending: reuse the Splash composition component. As I scroll through the last ~150vh, progress scrubs the
counter 0→100 and grows the centre image (DESIGN.md §8.4 "About → Work"). At 100 (with a short debounce so a
small overscroll doesn't trigger it), navigate to Work with ?from=about, and Work plays only the splash exit
(no loading phase). Add a visible "Go to Work →" link in the bottom row for keyboard/reduced motion.
Make sure scrolling back up before 100 cancels it cleanly, and the browser Back button from Work returns to About.
```

### Phase 10 (revised): Slide-up sheet transitions
```
Implement the page transitions from DESIGN.md §8.4 with Astro view transitions + GSAP:
1. Work → case study: the paper sheet rises from the bottom (900ms expo.inOut) carrying the case-study hero;
   the slider dims behind it. Use a custom transition (transition:animate with our own keyframes, or a persisted
   overlay element animated in astro:before-preparation / astro:after-swap).
2. Close / browser Back: the sheet slides down and the slider reappears on the same slide (index from ?p= or
   sessionStorage). Scroll position and slider state restore correctly.
3. Case study → NextProject: the current sheet slides up and away, the next one rises.
4. Work ↔ About: the nav underline slides between "Work" and "About"; the background colour tweens stage ↔ paper.
Kill/recreate GSAP, ScrollTrigger, Lenis and the slider on every swap (CLAUDE.md lifecycle rules). Test 10 rapid
back/forward navigations for leaks. Reduced motion: 150ms crossfade. Test Chrome, Safari, Firefox.
```

### Phase 11: removed
The intro loader is now the splash (Phase 4R-a).

---

## 4. Handy tuning prompts for this direction
- `The slider feels [heavy / floaty / too fast]. Tune only lerp, snap delay and skew in one place (src/lib/motion.ts) and give me 3 presets to try via ?feel=1|2|3.`
- `Compare the splash timing to references/photoyoshi-splash-frames/*. List each step with its duration, then match the rhythm.`
- `The monochrome→colour hover feels [abrupt / too slow]. Try a radial clip-path colour reveal from the cursor (DOM) and show me both versions.`
