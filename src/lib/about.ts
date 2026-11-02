// About page behaviour (Phase 9, DESIGN.md §8.4):
//   the sticky portrait drifts slightly as you scroll (parallax);
//   the ending scrubs the splash composition — counter 0→100, centre image .5→1.4 — over the last
//   ~150vh, and at 100 (held for 300ms, so a small overscroll doesn't count) carries on to Work with
//   ?from=about, where only the splash exit plays. Scrolling back up before then cancels it.
//   Work opens on its first project (NBA Research Lab), not the slide last viewed there.
//   Arriving with the ending already at 100 (Back from Work) never re-triggers until you scroll up.
import { gsap, ScrollTrigger } from './motion';
import { onPage } from './lifecycle';
import { createComposition } from './splash-composition';

const HOLD_MS = 300;

// Forget the stage's remembered slide (lib/stage.ts) so Work starts on the first project.
function resetStage() {
  try {
    sessionStorage.removeItem('stage-index');
  } catch {
    /* storage blocked: the stage starts at 0 anyway */
  }
}

async function goToWork(href: string) {
  resetStage();
  const { navigate } = await import('astro:transitions/client');
  navigate(`${href}?from=about`);
}

onPage(({ mm, signal }) => {
  const end = document.querySelector<HTMLElement>('[data-about-end]');
  if (!end) return;
  const compEl = end.querySelector<HTMLElement>('[data-comp]');
  if (!compEl) return;
  const comp = createComposition(compEl);
  comp.fit();
  comp.setImage(0);
  window.addEventListener('resize', () => comp.fit(), { signal });
  end.querySelector('[data-comp-cta]')?.addEventListener('click', resetStage, { signal });

  mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, (context) => {
    const { reduced } = context.conditions as Record<string, boolean>;

    if (reduced) {
      // No scroll-driven hand-off: the ending shows its final state and the "Go to Work →" link.
      comp.setProgress(100);
      return;
    }

    const portrait = document.querySelector<HTMLElement>('[data-about-portrait]');
    if (portrait) {
      gsap.fromTo(portrait, { yPercent: -4, scale: 1.08 }, {
        yPercent: 4,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top top', end: 'bottom bottom', scrub: true },
      });
    }

    let armed = false;
    let timer = 0;
    const href = end.dataset.workHref ?? '/';
    const trigger = ScrollTrigger.create({
      trigger: end,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        comp.setProgress(p * 100, { scaleImage: true });
        if (p < 0.95) armed = true;
        if (p >= 0.999 && armed && !timer) {
          timer = window.setTimeout(() => {
            timer = 0;
            if (trigger.progress >= 0.999) goToWork(href);
          }, HOLD_MS);
        } else if (p < 0.999 && timer) {
          clearTimeout(timer);
          timer = 0;
        }
      },
    });
    // Start state matches the scroll position (e.g. Back from Work lands at the bottom: not armed).
    comp.setProgress(trigger.progress * 100, { scaleImage: true });
    armed = trigger.progress < 0.95;

    return () => clearTimeout(timer);
  });
});
