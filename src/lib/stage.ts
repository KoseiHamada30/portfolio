// Work stage behaviour (DESIGN.md §8.3–8.5). Markup: src/components/Stage.astro.
//   Fine pointer: a looping slider. Wheel, drag (with inertia), arrow keys and clicks on the
//   neighbours set a target index; the position eases toward it, movement adds a small skew,
//   and it snaps to the nearest slide after 150ms idle. Colour and the centred title follow
//   the hovered slide, and a colour lens trails the pointer. The pointer itself stays native.
//   Touch / no JS: the track stays a native scroll-snap list; this only tracks the active slide.
// Tuning lives in CSS custom properties (tokens.css) so the Site Tuner can change them live.
import { gsap, ease, media } from './motion';
import { onPage } from './lifecycle';

const SNAP_AFTER = 150;
const STORE_INDEX = 'stage-index';
const STORE_VIEW = 'stage-view';

const wrap = (value: number, n: number) => ((value % n) + n) % n;
/** Signed distance in a loop of n, in [-n/2, n/2). */
const loopDelta = (value: number, n: number) => wrap(value + n / 2, n) - n / 2;

/** Slide to start on: ?p=<slug> (Close from a case study), else the remembered one. */
function startIndex(root: HTMLElement, n: number): number {
  const params = new URLSearchParams(location.search);
  const slug = params.get('p');
  if (slug) {
    params.delete('p');
    const query = params.toString();
    history.replaceState(history.state, '', location.pathname + (query ? `?${query}` : '') + location.hash);
    const i = [...root.querySelectorAll<HTMLElement>('[data-stage-slide]')].findIndex((s) => s.dataset.id === slug);
    if (i >= 0) {
      writeStore(STORE_INDEX, String(i));
      return i;
    }
  }
  const saved = Number(readStore(STORE_INDEX));
  return Number.isInteger(saved) && saved >= 0 && saved < n ? saved : 0;
}

function readStore(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // storage blocked: the stage just starts at the first project next time
  }
}

interface Slide {
  el: HTMLElement;
  link: HTMLAnchorElement;
}

function collect(root: HTMLElement): Slide[] {
  return [...root.querySelectorAll<HTMLElement>('[data-stage-slide]')].map((el) => ({
    el,
    link: el.querySelector<HTMLAnchorElement>('[data-stage-link]')!,
  }));
}

/** Shared by both modes: active class, live region, remembered position. */
function makeActivator(root: HTMLElement, slides: Slide[]) {
  const live = root.querySelector<HTMLElement>('[data-stage-live]');
  const template = live?.dataset.template ?? '';
  const n = slides.length;
  let active = -1;

  return (index: number, announce = true) => {
    if (index === active) return;
    active = index;
    slides.forEach((slide, i) => slide.el.classList.toggle('is-active', i === index));
    writeStore(STORE_INDEX, String(index));
    if (announce && live) {
      live.textContent = template
        .replace('{n}', String(index + 1))
        .replace('{total}', String(n))
        .replace('{title}', slides[index].el.dataset.title ?? '');
    }
  };
}

/** Slider mode's single centred title: crossfades to whichever slide is shown (hovered, else centred). */
function makeTitles(root: HTMLElement, animate: boolean) {
  const captions = [...root.querySelectorAll<HTMLElement>('[data-stage-titles] .stage__caption')];
  let shown = -1;
  gsap.set(captions, { autoAlpha: 0 });

  return (index: number) => {
    if (index === shown) return;
    const previous = shown;
    shown = index;
    if (!animate) {
      captions.forEach((el, i) => gsap.set(el, { autoAlpha: i === index ? 1 : 0 }));
      return;
    }
    gsap.to(captions[index], { autoAlpha: 1, duration: 0.5, ease: 'power2.out', overwrite: true });
    if (previous >= 0) gsap.to(captions[previous], { autoAlpha: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
  };
}

/** Full-colour copy of each cover, revealed through the pointer lens. */
function addLenses(slides: Slide[]): HTMLElement[] {
  return slides.map((slide) => {
    const lens = document.createElement('span');
    lens.className = 'stage__lens';
    lens.setAttribute('aria-hidden', 'true');
    const media = slide.el.querySelector('.stage__media');
    media?.childNodes.forEach((node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      if (copy instanceof HTMLImageElement) {
        copy.alt = '';
        copy.loading = 'eager';
      }
      lens.append(copy);
    });
    media?.after(lens);
    return lens;
  });
}

// -------------------------------------------------------------- slider

function virtualSlider(root: HTMLElement, reduced: boolean): () => void {
  const track = root.querySelector<HTMLElement>('[data-stage-track]')!;
  const slides = collect(root);
  const n = slides.length;
  const controller = new AbortController();
  const { signal } = controller;

  root.classList.add('is-virtual');
  track.scrollLeft = 0; // left over from native mode (e.g. after a pointer change)

  let lerp = 0.09;
  let maxSkew = 4;
  let inactiveScale = 0.92;
  let step = 0;
  let box = { left: 0, top: 0, w: 0, h: 0, slideW: 0 }; // measured on resize, not per frame
  const readTuning = () => {
    const css = getComputedStyle(root);
    const num = (name: string, fallback: number) => {
      const value = parseFloat(css.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    lerp = reduced ? 1 : Math.min(1, Math.max(0.01, num('--stage-lerp', 0.09)));
    maxSkew = reduced ? 0 : num('--stage-skew', 4);
    inactiveScale = num('--stage-scale', 0.92);
    step = slides[0].el.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
    const rect = track.getBoundingClientRect();
    box = { left: rect.left, top: rect.top, w: track.clientWidth, h: track.clientHeight, slideW: slides[0].el.offsetWidth };
  };
  readTuning();

  let target = startIndex(root, n);
  let current = target;
  let lastInput = 0;
  let dragging = false;
  let didDrag = false;

  const activate = makeActivator(root, slides);
  activate(wrap(Math.round(current), n), false);
  const showTitle = makeTitles(root, !reduced);
  const lenses = reduced ? [] : addLenses(slides);

  // Pointer: which slide is hovered (colour + title follow it), and the eased lens position.
  let pointer: { x: number; y: number } | null = null;
  let lens = { x: 0, y: 0, pow: 0, lastX: 0, lastY: 0 };
  let lit = -1;
  const geometry = (i: number) => {
    // analytic slide box (no layout reads in the frame loop); skew is ignored
    const d = loopDelta(i - current, n);
    const scale = 1 - (1 - inactiveScale) * Math.min(1, Math.abs(d));
    const w = box.slideW * scale;
    const h = box.h * scale;
    const left = box.w / 2 + d * step - w / 2;
    const top = (box.h - h) / 2;
    return { d, scale, left, top, w, h };
  };
  const slideAt = (x: number, y: number) => {
    for (let i = 0; i < n; i++) {
      const g = geometry(i);
      if (Math.abs(g.d) > 1.6) continue;
      if (x - box.left >= g.left && x - box.left <= g.left + g.w && y - box.top >= g.top && y - box.top <= g.top + g.h) return i;
    }
    return -1;
  };

  const inStageView = () => root.dataset.view === 'stage';
  const nudge = (to: number) => {
    target = to;
    lastInput = performance.now();
  };

  // ---------------------------------------------------------- render
  let previous = current;
  const render = (_time: number, deltaMs: number) => {
    const now = performance.now();
    if (!dragging && now - lastInput > SNAP_AFTER) target = Math.round(target);

    const k = 1 - Math.pow(1 - lerp, Math.min(deltaMs, 100) / (1000 / 60));
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.0005) current = target;

    const velocity = current - previous; // slides per frame
    previous = current;
    const skew = gsap.utils.clamp(-maxSkew, maxSkew, -velocity * 60);

    for (let i = 0; i < n; i++) {
      const d = loopDelta(i - current, n);
      const scale = 1 - (1 - inactiveScale) * Math.min(1, Math.abs(d));
      slides[i].el.style.transform = `translate3d(${(d * step).toFixed(2)}px,0,0) scale(${scale.toFixed(4)}) skewX(${skew.toFixed(3)}deg)`;
      // the slide that wraps from one side to the other must not be seen crossing
      slides[i].el.style.visibility = Math.abs(d) > n / 2 - 0.6 ? 'hidden' : '';
    }
    const centred = wrap(Math.round(current), n);
    activate(centred);

    // Colour and title follow the hovered slide; over a gap the last one stays lit.
    if (pointer && !dragging && inStageView()) {
      const hit = slideAt(pointer.x, pointer.y);
      if (hit >= 0) lit = hit;
    } else lit = -1;
    const shown = lit >= 0 ? lit : centred;
    slides.forEach((slide, i) => slide.el.classList.toggle('is-lit', i === shown));
    showTitle(shown);
    if (lenses.length) setFill(shown);

    if (lenses.length) drawLens(deltaMs);
    // focus() on an off-centre link can scroll even an overflow:hidden track
    if (track.scrollLeft) track.scrollLeft = 0;
  };

  // The lens trails the pointer (ease .1). Its radius on each slide is a small speed-sized blob
  // plus that slide's hover fill: hovering grows a brighter full-colour circle outward from the
  // pointer (1s, power2.out) while the whole slide warms from grey on the same curve (CSS), with
  // a ragged, slowly shifting edge — the reference's noise-dissolve circle, done with clip-path.
  const POINTS = 64;
  const fill = slides.map(() => ({ v: 0 }));
  let filled = -2;
  let time = 0;
  const setFill = (index: number) => {
    if (index === filled) return;
    const first = filled === -2;
    filled = index;
    // on load the centred slide is simply in colour; nothing grows from a stale pointer position
    if (first) return fill.forEach((f, i) => (f.v = i === index ? 1 : 0));
    fill.forEach((f, i) => gsap.to(f, { v: i === index ? 1 : 0, duration: 1, ease: 'power2.out', overwrite: true }));
  };
  const drawLens = (deltaMs: number) => {
    const f = Math.min(deltaMs, 100) / (1000 / 60);
    const target = pointer ?? { x: lens.x, y: lens.y };
    lens.x += (target.x - lens.x) * (1 - Math.pow(0.9, f));
    lens.y += (target.y - lens.y) * (1 - Math.pow(0.9, f));
    const speed = Math.hypot(target.x - lens.lastX, target.y - lens.lastY) / Math.max(f, 0.001);
    lens.lastX = target.x;
    lens.lastY = target.y;
    lens.pow += (Math.min(speed / 40, 1) - lens.pow) * (1 - Math.pow(0.9, f));
    time += 0.03 * f;
    const blob = pointer && inStageView() ? lens.pow * 40 : 0;
    // the reference's colour circle grows from ~4% to ~38% of the viewport width as hover goes 0 → 1
    const reach = box.w * 0.34;
    const base = box.w * 0.04;

    for (let i = 0; i < n; i++) {
      const el = lenses[i];
      const g = geometry(i);
      const radius = blob + (fill[i].v > 0.001 ? base + fill[i].v * reach : 0);
      if (radius < 0.5 || Math.abs(g.d) > 1.6) {
        if (el.style.clipPath !== 'circle(0px)') el.style.clipPath = 'circle(0px)';
        continue;
      }
      // pointer in the slide's own (unscaled) coordinates
      const cx = (lens.x - box.left - g.left) / g.scale;
      const cy = (lens.y - box.top - g.top) / g.scale;
      const r = radius / g.scale;
      // edge raggedness in px, capped so the big fill keeps a fine, grainy edge
      const amp = Math.min(r * 0.12, 28);
      let path = '';
      for (let p = 0; p < POINTS; p++) {
        const a = (p / POINTS) * Math.PI * 2;
        const edge =
          Math.sin(3 * a + time) * 0.55 +
          Math.sin(7 * a - time * 1.4) * 0.3 +
          Math.sin(17 * a + time * 2.1) * 0.15;
        const rr = r + edge * amp;
        path += `${p ? ',' : ''}${(cx + Math.cos(a) * rr).toFixed(1)}px ${(cy + Math.sin(a) * rr).toFixed(1)}px`;
      }
      el.style.clipPath = `polygon(${path})`;
    }
  };

  root.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (!pointer) lens = { x: event.clientX, y: event.clientY, pow: 0, lastX: event.clientX, lastY: event.clientY };
    pointer = { x: event.clientX, y: event.clientY };
  }, { signal });
  root.addEventListener('pointerleave', () => (pointer = null), { signal });
  gsap.ticker.add(render);

  // ----------------------------------------------------------- wheel
  // One gesture = one slide. A trackpad flick fires a long tail of momentum events, so after a
  // step the wheel is locked until it goes quiet (160ms), or until a clearly new push arrives
  // during the tail. Each mouse-wheel notch with a pause between moves one slide.
  const WHEEL_STEP = 30; // px of travel needed to move
  const WHEEL_QUIET = 160;
  let wheelSum = 0;
  let wheelLocked = false;
  let wheelLockedAt = 0;
  let wheelLast = 0;
  let wheelLastAbs = 0;
  root.addEventListener(
    'wheel',
    (event) => {
      if (!inStageView()) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
      const abs = Math.abs(delta);
      const now = event.timeStamp;
      const freshPush = wheelLocked && now - wheelLockedAt > 450 && abs > 20 && abs > wheelLastAbs * 1.6;
      if (now - wheelLast > WHEEL_QUIET || freshPush) {
        wheelLocked = false;
        wheelSum = 0;
      }
      wheelLast = now;
      wheelLastAbs = abs;
      if (wheelLocked) return;
      wheelSum += delta;
      if (Math.abs(wheelSum) >= WHEEL_STEP) {
        nudge(Math.round(target) + Math.sign(wheelSum));
        wheelLocked = true;
        wheelLockedAt = now;
        wheelSum = 0;
      }
    },
    { passive: false, signal },
  );

  // ------------------------------------------------------------ drag
  let startX = 0;
  let startTarget = 0;
  let samples: { x: number; t: number }[] = [];
  track.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || !inStageView()) return;
      startX = event.clientX;
      startTarget = target;
      samples = [{ x: event.clientX, t: event.timeStamp }];
      didDrag = false;
      dragging = true;
    },
    { signal },
  );
  track.addEventListener(
    'pointermove',
    (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (!didDrag && Math.abs(dx) > 5) {
        didDrag = true;
        // captured only once it's a drag, so a plain click still reaches the slide link
        track.setPointerCapture(event.pointerId);
        root.classList.add('is-dragging');
      }
      if (!didDrag) return;
      samples.push({ x: event.clientX, t: event.timeStamp });
      if (samples.length > 6) samples.shift();
      nudge(startTarget - dx / step);
    },
    { signal },
  );
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (!didDrag) return;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = (last.x - first.x) / dt; // px per ms
    // Inertia: carry on in the throw direction (at most two slides), then snap.
    nudge(Math.round(target - gsap.utils.clamp(-2, 2, (velocity * 220) / step)));
    root.classList.remove('is-dragging');
  };
  track.addEventListener('pointerup', endDrag, { signal });
  track.addEventListener('pointercancel', endDrag, { signal });

  // ----------------------------------------------- click & keyboard
  const indexOf = (el: Element | null) => slides.findIndex((s) => s.el.contains(el));
  const goTo = (i: number) => nudge(Math.round(current) + loopDelta(i - Math.round(current), n));

  track.addEventListener(
    'click',
    (event) => {
      if (didDrag) {
        event.preventDefault();
        didDrag = false;
        return;
      }
      const i = indexOf(event.target as Element);
      if (i >= 0 && !slides[i].el.classList.contains('is-active')) {
        event.preventDefault(); // neighbours move into place; only the centre slide opens
        goTo(i);
      }
    },
    { signal },
  );

  // Tabbing to a slide brings it to the centre
  track.addEventListener(
    'focusin',
    (event) => {
      const i = indexOf(event.target as Element);
      if (i >= 0) goTo(i);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!inStageView() || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const typing = (event.target as Element).closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      event.preventDefault();
      const next = Math.round(target) + (event.key === 'ArrowRight' ? 1 : -1);
      nudge(next);
      // Keep keyboard focus on the centred slide
      if (track.contains(document.activeElement)) slides[wrap(next, n)].link.focus({ preventScroll: true });
    },
    { signal },
  );

  window.addEventListener('resize', readTuning, { signal });
  document.addEventListener('tuner:css', readTuning, { signal });

  return () => {
    controller.abort();
    gsap.ticker.remove(render);
    root.classList.remove('is-virtual', 'is-dragging');
    lenses.forEach((el) => el.remove());
    slides.forEach((slide) => {
      slide.el.style.transform = '';
      slide.el.style.visibility = '';
      slide.el.classList.remove('is-lit');
    });
  };
}

// --------------------------------------------------- touch / native

function nativeSlider(root: HTMLElement): () => void {
  const track = root.querySelector<HTMLElement>('[data-stage-track]')!;
  const slides = collect(root);
  const controller = new AbortController();
  const { signal } = controller;
  const activate = makeActivator(root, slides);

  const nearest = () => {
    const centre = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    slides.forEach((slide, i) => {
      const distance = Math.abs(slide.el.offsetLeft + slide.el.offsetWidth / 2 - centre);
      if (distance < bestDistance) [best, bestDistance] = [i, distance];
    });
    return best;
  };

  const saved = startIndex(root, slides.length);
  if (slides[saved]) {
    const el = slides[saved].el;
    track.scrollLeft = el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;
  }
  activate(nearest(), false);

  let queued = false;
  track.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        activate(nearest());
      });
    },
    { passive: true, signal },
  );

  // Tapping a neighbour centres it; tapping the centred slide opens it.
  track.addEventListener(
    'click',
    (event) => {
      const i = slides.findIndex((s) => s.el.contains(event.target as Node));
      if (i >= 0 && !slides[i].el.classList.contains('is-active')) {
        event.preventDefault();
        slides[i].el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    },
    { signal },
  );

  return () => controller.abort();
}

// --------------------------------------------------------- index view

function setupViews(root: HTMLElement, signal: AbortSignal) {
  const index = root.querySelector<HTMLElement>('[data-stage-index]');
  const track = root.querySelector<HTMLElement>('[data-stage-track]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-view-option]')];
  if (!index || !track) return;

  const show = (view: string, animate: boolean) => {
    root.dataset.view = view;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewOption === view)));
    writeStore(STORE_VIEW, view);
    const isIndex = view === 'index';
    if (isIndex) index.hidden = false;
    track.inert = isIndex;
    if (!animate) {
      index.hidden = !isIndex;
      gsap.set(index, { clearProps: 'opacity' });
      return;
    }
    gsap.fromTo(index, { opacity: isIndex ? 0 : 1 }, {
      opacity: isIndex ? 1 : 0,
      duration: 0.35,
      ease: ease.out,
      overwrite: true,
      onComplete: () => {
        if (!isIndex) index.hidden = true;
        gsap.set(index, { clearProps: 'opacity' });
      },
    });
    if (isIndex) {
      gsap.from(index.querySelectorAll('.stage-index__row'), { y: 24, opacity: 0, duration: 0.6, stagger: 0.05, ease: ease.outExpo });
    }
  };

  buttons.forEach((button) =>
    button.addEventListener('click', () => show(button.dataset.viewOption ?? 'stage', true), { signal }),
  );
  show(readStore(STORE_VIEW) === 'index' ? 'index' : 'stage', false);

  // Hover / focus preview: monochrome first, colour blooms in (CSS)
  const preview = root.querySelector<HTMLElement>('[data-index-preview]');
  if (!preview) return;
  const showPreview = (id: string | null) => {
    preview.classList.toggle('is-on', Boolean(id));
    preview.querySelectorAll<HTMLElement>('[data-preview-id]').forEach((el) => el.classList.toggle('is-shown', el.dataset.previewId === id));
  };
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3.out' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3.out' });
  const place = (x: number, y: number, jump = false) => {
    // right of the pointer, vertically centred on it; flips left near the right edge
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    const left = x + 32 + w > window.innerWidth ? x - 32 - w : x + 32;
    const top = gsap.utils.clamp(8, window.innerHeight - h - 8, y - h / 2);
    if (jump) gsap.set(preview, { x: left, y: top });
    else {
      xTo(left);
      yTo(top);
    }
  };
  index.addEventListener('pointermove', (e) => place(e.clientX, e.clientY, !preview.classList.contains('is-on')), { signal });
  index.addEventListener('pointerover', (e) => showPreview((e.target as Element).closest<HTMLElement>('[data-index-link]')?.dataset.indexLink ?? null), { signal });
  index.addEventListener('pointerleave', () => showPreview(null), { signal });
  index.addEventListener('focusin', (e) => {
    const link = (e.target as Element).closest<HTMLElement>('[data-index-link]');
    if (!link) return;
    const box = link.querySelector('.stage-index__title')!.getBoundingClientRect();
    place(box.right, box.top + box.height / 2, true);
    showPreview(link.dataset.indexLink ?? null);
  }, { signal });
  index.addEventListener('focusout', () => showPreview(null), { signal });
}

// ------------------------------------------------------------ rise-in

function riseIn(root: HTMLElement) {
  const links = [...root.querySelectorAll<HTMLElement>('.stage__slide .stage__link, [data-stage-titles]')];
  gsap.set(links, { y: 90, opacity: 0 });
  const play = () => {
    gsap.to(links, { y: 0, opacity: 1, duration: 1, ease: ease.outExpo, stagger: 0.06, clearProps: 'transform,opacity' });
  };
  // Under the splash, wait until Home starts sliding in (splash.ts dispatches this).
  if (document.documentElement.classList.contains('splash-on')) {
    document.addEventListener('splash:reveal', play, { once: true });
  } else play();
}

onPage(({ mm, signal }) => {
  const root = document.querySelector<HTMLElement>('[data-stage]');
  if (!root) return;

  setupViews(root, signal);

  mm.add({ fine: media.pointerFine, reduced: media.reduced, motion: media.motion }, (context) => {
    const { fine, reduced, motion } = context.conditions as Record<string, boolean>;
    if (motion) riseIn(root);
    return fine ? virtualSlider(root, reduced) : nativeSlider(root);
  });
});
