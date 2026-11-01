// Work index behaviour (DESIGN.md §5.3): grid ↔ list with GSAP Flip, and a cursor-following
// preview in list mode (lerp 0.15, slight rotation from horizontal velocity).
import { gsap, ScrollTrigger, ease, media, prefersReducedMotion } from './motion';
import { beforePage, onPage } from './lifecycle';

type View = 'grid' | 'list';
type FlipPlugin = typeof import('gsap/Flip').Flip;

const STORAGE_KEY = 'work-view';
let Flip: FlipPlugin | null = null;

// Flip is fetched only on pages with a work index.
beforePage(async () => {
  if (Flip || !document.querySelector('[data-work]')) return;
  ({ Flip } = await import('gsap/Flip'));
  gsap.registerPlugin(Flip);
});

function storedView(): View {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function setView(work: HTMLElement, toggle: HTMLElement, view: View, animate: boolean) {
  if (work.dataset.view === view) return;
  toggle.querySelectorAll<HTMLButtonElement>('[data-view-option]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.viewOption === view));
  });

  if (!animate || !Flip || prefersReducedMotion()) {
    work.dataset.view = view;
  } else {
    const state = Flip.getState(work.querySelectorAll('.work-item, .work-card__title, .work-card__category, .work-card__year'));
    work.dataset.view = view;
    Flip.from(state, {
      duration: 0.7,
      ease: ease.inOut,
      absolute: '.work-item',
      nested: true,
      stagger: 0.04,
      onComplete: () => ScrollTrigger.refresh(),
    });
  }
  if (!animate) ScrollTrigger.refresh();
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // not persisted — fine
  }
}

function hoverPreview(work: HTMLElement, preview: HTMLElement, signal: AbortSignal) {
  const items = new Map<string, HTMLElement>();
  preview.querySelectorAll<HTMLElement>('[data-preview-id]').forEach((el) => items.set(el.dataset.previewId!, el));

  const size = () => preview.getBoundingClientRect();
  const pos = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let lastX = 0;
  let rotation = 0;
  let visible = false;

  const show = (id: string | undefined) => {
    items.forEach((el, key) => el.classList.toggle('is-active', key === id));
    if (!visible) {
      visible = true;
      Object.assign(pos, target);
      gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.28, ease: ease.out, overwrite: 'auto' });
    }
  };
  const hide = () => {
    if (!visible) return;
    visible = false;
    gsap.to(preview, { autoAlpha: 0, scale: 0.94, duration: 0.18, ease: ease.out, overwrite: 'auto' });
  };

  gsap.set(preview, { scale: 0.94, xPercent: -50, yPercent: -50 });

  const tick = () => {
    if (!visible) return;
    pos.x += (target.x - pos.x) * 0.15;
    pos.y += (target.y - pos.y) * 0.15;
    const velocity = pos.x - lastX;
    lastX = pos.x;
    rotation += (gsap.utils.clamp(-8, 8, velocity * 0.6) - rotation) * 0.15;
    gsap.set(preview, { x: pos.x, y: pos.y, rotation });
  };
  gsap.ticker.add(tick);

  work.addEventListener(
    'pointermove',
    (event) => {
      if (work.dataset.view !== 'list') return hide();
      // Offset so the preview sits beside the pointer, not under it.
      const { width } = size();
      target.x = event.clientX + width * 0.5 + 24;
      target.y = event.clientY;
      const card = (event.target as Element).closest<HTMLElement>('[data-preview]');
      if (card) show(card.dataset.preview);
      else hide();
    },
    { signal },
  );
  work.addEventListener('pointerleave', hide, { signal });
  window.addEventListener('scroll', hide, { passive: true, signal });

  return () => {
    gsap.ticker.remove(tick);
    hide();
  };
}

onPage(({ mm, signal }) => {
  const work = document.querySelector<HTMLElement>('[data-work]');
  const toggle = document.querySelector<HTMLElement>('[data-view-toggle]');
  const preview = document.querySelector<HTMLElement>('[data-work-preview]');
  if (!work || !toggle) return;

  setView(work, toggle, storedView(), false);
  toggle.addEventListener(
    'click',
    (event) => {
      const option = (event.target as Element).closest<HTMLButtonElement>('[data-view-option]');
      if (option) setView(work, toggle, option.dataset.viewOption as View, true);
    },
    { signal },
  );

  if (!preview) return;
  mm.add(`${media.motion} and ${media.pointerFine}`, () => {
    const branch = new AbortController();
    const cleanup = hoverPreview(work, preview, AbortSignal.any([signal, branch.signal]));
    return () => {
      branch.abort();
      cleanup();
    };
  });
});
