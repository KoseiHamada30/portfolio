// Hero motion (DESIGN.md §5.2): letter-mask reveal on load + blob leaning toward the cursor.
import { gsap, ease, dur, stagger, media } from './motion';
import { onPage } from './lifecycle';

const LEAN_MAX = 20; // px
const LEAN_STRENGTH = 0.04;

onPage(({ mm, signal }) => {
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const blob = document.querySelector<HTMLElement>('[data-blob]');
  if (!title) return;
  blob?.classList.add('is-ready');

  mm.add(media.motion, () => {
    gsap.set(title, { opacity: 1 });
    gsap.from(title.querySelectorAll('[data-hero-char]'), {
      yPercent: 110,
      duration: dur.reveal,
      ease: ease.outExpo,
      stagger: stagger.text,
      delay: 0.1,
    });
  });

  mm.add(media.reduced, () => {
    gsap.fromTo(title, { opacity: 0 }, { opacity: 1, duration: dur.reducedFade, ease: ease.linear });
  });

  if (!blob) return;
  mm.add(`${media.motion} and ${media.pointerFine}`, () => {
    const branch = new AbortController();
    const xTo = gsap.quickTo(blob, 'x', { duration: 1.2, ease: 'power3.out' });
    const yTo = gsap.quickTo(blob, 'y', { duration: 1.2, ease: 'power3.out' });
    window.addEventListener(
      'pointermove',
      (event) => {
        const box = blob.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        xTo(gsap.utils.clamp(-LEAN_MAX, LEAN_MAX, dx * LEAN_STRENGTH));
        yTo(gsap.utils.clamp(-LEAN_MAX, LEAN_MAX, dy * LEAN_STRENGTH));
      },
      { passive: true, signal: AbortSignal.any([signal, branch.signal]) },
    );
    return () => branch.abort();
  });
});
