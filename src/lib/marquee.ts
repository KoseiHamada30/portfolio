// Velocity-aware marquee (DESIGN.md §4.3 + §5.9). Markup:
//
//   <div data-marquee>
//     <div data-marquee-track>…items…</div>
//   </div>
//
// Moves linearly at ~40px/s (data-marquee-speed to override). Scroll velocity speeds it up
// (clamped 0.5×–3×) and sets its direction. Pauses on hover and focus. Static under reduced motion.
import { gsap, ScrollTrigger, media } from './motion';
import { onPage } from './lifecycle';

const BASE_SPEED = 40; // px per second
const MIN_FACTOR = 0.5;
const MAX_FACTOR = 3;

function marquee(root: HTMLElement, signal: AbortSignal) {
  const track = root.querySelector<HTMLElement>('[data-marquee-track]');
  if (!track) return () => {};

  // Clone the track until two copies cover the viewport, so the loop never shows a gap.
  const clones: HTMLElement[] = [];
  const trackWidth = track.scrollWidth;
  if (trackWidth === 0) return () => {};
  const copies = Math.max(1, Math.ceil(root.clientWidth / trackWidth));
  for (let i = 0; i < copies; i++) {
    const clone = track.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('data-marquee-track');
    clone.querySelectorAll('a, button, [tabindex]').forEach((node) => node.setAttribute('tabindex', '-1'));
    track.after(clone);
    clones.push(clone);
  }

  const strip = [track, ...clones];
  const baseSpeed = Number(root.dataset.marqueeSpeed) || BASE_SPEED;
  let x = 0;
  let direction = -1; // -1 = right-to-left
  let factor = 1;
  let targetFactor = 1;
  let paused = false;
  let pauseMix = 1; // 1 = moving, 0 = stopped; eased so hover doesn't jolt

  const velocityWatcher = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate(self) {
      const velocity = self.getVelocity(); // px/s
      if (Math.abs(velocity) > 20) direction = velocity > 0 ? -1 : 1;
      targetFactor = gsap.utils.clamp(MIN_FACTOR, MAX_FACTOR, 1 + Math.abs(velocity) / 600);
    },
  });

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 64) / 1000;
    targetFactor += (1 - targetFactor) * 0.05; // settle back to base speed after scrolling
    factor += (targetFactor - factor) * 0.1;
    pauseMix += ((paused ? 0 : 1) - pauseMix) * 0.12;

    x += direction * baseSpeed * factor * pauseMix * dt;
    x = gsap.utils.wrap(-trackWidth, 0, x);
    for (const el of strip) el.style.transform = `translate3d(${x}px, 0, 0)`;
  };
  gsap.ticker.add(tick);

  const pause = () => (paused = true);
  const resume = () => (paused = false);
  root.addEventListener('pointerenter', pause, { signal });
  root.addEventListener('pointerleave', resume, { signal });
  root.addEventListener('focusin', pause, { signal });
  root.addEventListener('focusout', resume, { signal });

  return () => {
    gsap.ticker.remove(tick);
    velocityWatcher.kill();
    clones.forEach((clone) => clone.remove());
    track.style.transform = '';
  };
}

onPage(({ mm, signal }) => {
  mm.add(media.motion, () => {
    const branch = new AbortController();
    const both = AbortSignal.any([signal, branch.signal]);
    const cleanups = gsap.utils.toArray<HTMLElement>('[data-marquee]').map((el) => marquee(el, both));
    return () => {
      branch.abort();
      cleanups.forEach((fn) => fn());
    };
  });
});
