// Magnetic buttons (DESIGN.md §4.3): <a data-magnetic>…</a>
// Follows the pointer by 0.25× its offset within an 80px radius of the element,
// releases with elastic.out(1, 0.4) over 600ms. Pointer-fine + full motion only.
import { gsap, media } from './motion';
import { onPage } from './lifecycle';

const STRENGTH = 0.25;
const RADIUS = 80;

function magnetic(el: HTMLElement, signal: AbortSignal) {
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
  let active = false;

  const release = () => {
    if (!active) return;
    active = false;
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: true });
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      // Distance from the element's edge, so large buttons get the same 80px field.
      const outsideX = Math.max(Math.abs(dx) - rect.width / 2, 0);
      const outsideY = Math.max(Math.abs(dy) - rect.height / 2, 0);

      if (Math.hypot(outsideX, outsideY) > RADIUS) {
        release();
        return;
      }
      active = true;
      xTo(dx * STRENGTH);
      yTo(dy * STRENGTH);
    },
    { passive: true, signal },
  );
  document.documentElement.addEventListener('pointerleave', release, { signal });
}

onPage(({ mm, signal }) => {
  mm.add(`${media.motion} and ${media.pointerFine}`, () => {
    // Listeners end on page swap *or* when this media branch stops matching.
    const branch = new AbortController();
    const both = AbortSignal.any([signal, branch.signal]);
    gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => magnetic(el, both));
    return () => branch.abort();
  });
});
