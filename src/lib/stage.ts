// Work stage behaviour (DESIGN.md §8.3–8.5). Markup: src/components/Stage.astro.
//   Fine pointer: a looping slider. Wheel, drag (with inertia), arrow keys and clicks on the
//   neighbours set a target index; the position eases toward it, movement adds a small skew,
//   and it snaps to the nearest slide after 150ms idle.
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
  title: HTMLElement | null;
  sub: HTMLElement | null;
}

function collect(root: HTMLElement): Slide[] {
  return [...root.querySelectorAll<HTMLElement>('[data-stage-slide]')].map((el) => ({
    el,
    link: el.querySelector<HTMLAnchorElement>('[data-stage-link]')!,
    title: el.querySelector<HTMLElement>('[data-stage-title]'),
    sub: el.querySelector<HTMLElement>('[data-stage-sub]'),
  }));
}

/** Shared by both modes: classes, live region, cursor labels, remembered position. */
function makeActivator(root: HTMLElement, slides: Slide[], roll: boolean) {
  const live = root.querySelector<HTMLElement>('[data-stage-live]');
  const template = live?.dataset.template ?? '';
  const n = slides.length;
  let active = -1;

  return (index: number, announce = true) => {
    if (index === active) return;
    const previous = active;
    active = index;
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.el.classList.toggle('is-active', isActive);
      const d = loopDelta(i - index, n);
      slide.link.dataset.cursor = isActive ? 'view' : d < 0 ? 'prev' : 'next';
    });
    writeStore(STORE_INDEX, String(index));
    if (announce && live) {
      live.textContent = template
        .replace('{n}', String(index + 1))
        .replace('{total}', String(n))
        .replace('{title}', slides[index].el.dataset.title ?? '');
    }
    document.dispatchEvent(new CustomEvent('cursor:refresh'));

    if (!roll) return;
    // Titles roll: the old one slides up and out, the new one rises in.
    const incoming = [slides[index].title, slides[index].sub].filter(Boolean);
    gsap.fromTo(incoming, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: ease.outExpo, stagger: 0.05, overwrite: true });
    if (previous >= 0) {
      const outgoing = [slides[previous].title, slides[previous].sub].filter(Boolean);
      gsap.to(outgoing, { yPercent: -105, duration: 0.45, ease: ease.out, overwrite: true });
    }
  };
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
  };
  readTuning();

  const saved = Number(readStore(STORE_INDEX));
  let target = Number.isInteger(saved) && saved >= 0 && saved < n ? saved : 0;
  let current = target;
  let lastInput = 0;
  let dragging = false;
  let didDrag = false;

  const activate = makeActivator(root, slides, !reduced);
  activate(wrap(Math.round(current), n), false);
  // Captions start hidden below their masks except the active one
  slides.forEach((slide, i) => {
    if (i !== wrap(Math.round(current), n)) gsap.set([slide.title, slide.sub].filter(Boolean), { yPercent: 105 });
  });

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
    activate(wrap(Math.round(current), n));
    // focus() on an off-centre link can scroll even an overflow:hidden track
    if (track.scrollLeft) track.scrollLeft = 0;
  };
  gsap.ticker.add(render);

  // ----------------------------------------------------------- wheel
  root.addEventListener(
    'wheel',
    (event) => {
      if (!inStageView()) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
      nudge(target + gsap.utils.clamp(-0.6, 0.6, (delta / step) * 1.6));
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
        document.dispatchEvent(new CustomEvent('cursor:drag', { detail: true }));
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
    document.dispatchEvent(new CustomEvent('cursor:drag', { detail: false }));
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
    slides.forEach((slide) => {
      slide.el.style.transform = '';
      slide.el.style.visibility = '';
      gsap.set([slide.title, slide.sub].filter(Boolean), { clearProps: 'transform' });
    });
  };
}

// --------------------------------------------------- touch / native

function nativeSlider(root: HTMLElement): () => void {
  const track = root.querySelector<HTMLElement>('[data-stage-track]')!;
  const slides = collect(root);
  const controller = new AbortController();
  const { signal } = controller;
  const activate = makeActivator(root, slides, false);

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

  const saved = Number(readStore(STORE_INDEX));
  if (Number.isInteger(saved) && slides[saved]) {
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
  const links = [...root.querySelectorAll<HTMLElement>('.stage__slide .stage__link')];
  gsap.set(links, { y: 90, opacity: 0 });
  const play = () => gsap.to(links, { y: 0, opacity: 1, duration: 1, ease: ease.outExpo, stagger: 0.06, clearProps: 'transform,opacity' });
  // After the splash, wait until its sheet starts sliding away (splash.ts dispatches this).
  if (document.querySelector('[data-splash-sheet].is-active')) {
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
