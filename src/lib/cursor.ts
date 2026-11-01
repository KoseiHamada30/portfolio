// Contextual cursor (DESIGN.md §5.4). Global, not per page: the <Cursor /> element is
// persisted across navigations and hover targets are found by event delegation.
import { gsap, media } from './motion';

type Label = 'view' | 'play' | 'drag' | 'copy' | 'prev' | 'next';

let started = false;

export function startCursor(): void {
  if (started) return;
  started = true;

  // Never reverted: this lives for the whole session and follows the media query.
  gsap.matchMedia().add(`${media.motion} and ${media.pointerFine}`, () => {
    const controller = new AbortController();
    const { signal } = controller;
    const html = document.documentElement;

    let root: HTMLElement | null = null;
    let label: HTMLElement | null = null;
    let labels: Partial<Record<Label, string>> = {};
    let xTo: gsap.QuickToFunc | null = null;
    let yTo: gsap.QuickToFunc | null = null;
    let last = { x: -100, y: -100 };
    let forced: Label | null = null; // e.g. 'drag' while the stage is being dragged

    const bind = () => {
      root = document.querySelector<HTMLElement>('[data-cursor-root]');
      label = root?.querySelector<HTMLElement>('[data-cursor-label]') ?? null;
      if (!root) return;
      try {
        labels = JSON.parse(root.dataset.labels ?? '{}');
      } catch {
        labels = {};
      }
      xTo = gsap.quickTo(root, 'x', { duration: 0.18, ease: 'power3.out' });
      yTo = gsap.quickTo(root, 'y', { duration: 0.18, ease: 'power3.out' });
      gsap.set(root, { x: last.x, y: last.y });
      root.classList.remove('is-label');
    };

    const setTarget = (target: Element | null) => {
      if (!root || !label) return;
      const kind = forced ?? (target?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor as Label | undefined);
      const text = kind ? labels[kind] : undefined;
      if (text) label.textContent = text;
      root.classList.toggle('is-label', Boolean(text));
    };

    html.classList.add('has-cursor');
    bind();

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse') return;
        last = { x: event.clientX, y: event.clientY };
        root?.classList.add('is-visible');
        xTo?.(event.clientX);
        yTo?.(event.clientY);
      },
      { passive: true, signal },
    );
    document.addEventListener('pointerover', (event) => setTarget(event.target as Element), { signal });
    document.addEventListener('pointerdown', () => root?.classList.add('is-pressed'), { signal });
    document.addEventListener('pointerup', () => root?.classList.remove('is-pressed'), { signal });
    // Leaving the window (or entering an iframe like a Figma embed) hides the dot.
    document.documentElement.addEventListener('pointerleave', () => root?.classList.remove('is-visible'), { signal });
    window.addEventListener('blur', () => root?.classList.remove('is-visible'), { signal });
    // The stage changes labels under a still pointer (active slide moved) and forces 'drag'.
    document.addEventListener('cursor:refresh', () => setTarget(document.elementFromPoint(last.x, last.y)), { signal });
    document.addEventListener('cursor:drag', (event) => {
      forced = (event as CustomEvent<boolean>).detail ? 'drag' : null;
      setTarget(document.elementFromPoint(last.x, last.y));
    }, { signal });
    // A new locale renders a new persisted element; rebind after each navigation.
    document.addEventListener('astro:page-load', () => {
      bind();
      setTarget(document.elementFromPoint(last.x, last.y));
    }, { signal });
    // ClientRouter copies <html> attributes from the new page, dropping has-cursor.
    document.addEventListener('astro:after-swap', () => html.classList.add('has-cursor'), { signal });

    return () => {
      controller.abort();
      html.classList.remove('has-cursor');
      root?.classList.remove('is-visible', 'is-label', 'is-pressed');
    };
  });
}
