// Case-study behaviour (CaseStudyLayout + case components):
//   reading rail built from the sections, with the current one marked; reading-progress bar;
//   videos that play only while centred in the viewport (v1 behaviour); bar charts that grow and
//   count up when they scroll in; before/after sliders.
import { gsap, ScrollTrigger } from './motion';
import { onPage } from './lifecycle';
import { getLenis } from './lenis';

function buildRail(signal: AbortSignal) {
  const rail = document.querySelector<HTMLOListElement>('[data-case-rail]');
  const sections = [...document.querySelectorAll<HTMLElement>('[data-case-section]')];
  if (!rail || !sections.length) return;

  rail.replaceChildren(
    ...sections.map((section) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${section.id}`;
      const num = document.createElement('span');
      num.textContent = section.dataset.num ?? '';
      const label = document.createElement('span');
      label.textContent = section.dataset.title ?? '';
      a.append(num, label);
      li.append(a);
      return li;
    }),
  );

  const links = [...rail.querySelectorAll('a')];
  rail.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element).closest('a');
      if (!link) return;
      const target = document.querySelector<HTMLElement>(link.hash);
      if (!target) return;
      event.preventDefault();
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { offset: -40 });
      else target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(history.state, '', link.hash);
    },
    { signal },
  );

  // The current section is the one crossing 40% of the viewport (none above the first one).
  const triggers = sections.map((section) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top 40%',
      end: 'bottom 40%',
      onToggle: () => links.forEach((link, j) => link.setAttribute('aria-current', String(triggers[j]?.isActive ?? false))),
    }),
  );
}

function progressBar() {
  const bar = document.querySelector<HTMLElement>('[data-case-progress]');
  if (!bar) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: true },
  });
}

/** v1: a muted loop plays only while its centre is inside the viewport. */
function centredVideos(reduced: boolean, signal: AbortSignal) {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-centre-play]')];
  if (!videos.length) return;
  if (reduced) {
    videos.forEach((video) => (video.controls = true));
    return;
  }
  const sync = () => {
    for (const video of videos) {
      const r = video.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const centred = r.width > 1 && cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight;
      if (centred && video.paused) video.play().catch(() => {});
      else if (!centred && !video.paused) video.pause();
    }
  };
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
    });
  };
  window.addEventListener('scroll', queue, { passive: true, signal });
  window.addEventListener('resize', queue, { signal });
  videos.forEach((video) => video.addEventListener('loadedmetadata', queue, { signal }));
  sync();
  signal.addEventListener('abort', () => videos.forEach((video) => video.pause()));
}

function barCharts(reduced: boolean) {
  document.querySelectorAll<HTMLElement>('[data-bars]').forEach((chart) => {
    const values = [...chart.querySelectorAll<HTMLElement>('[data-bars-value]')];
    ScrollTrigger.create({
      trigger: chart,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        chart.classList.add('is-in');
        if (reduced) return;
        values.forEach((el, i) => {
          const end = Number(el.dataset.barsValue);
          const counter = { v: 1 };
          gsap.to(counter, {
            v: end,
            duration: 1,
            delay: i * 0.06,
            ease: 'expo.out',
            onUpdate: () => (el.textContent = counter.v.toFixed(1)),
          });
        });
      },
    });
  });
}

function beforeAfter(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('[data-before-after]').forEach((figure) => {
    const input = figure.querySelector('input');
    input?.addEventListener('input', () => figure.style.setProperty('--pos', `${input.value}%`), { signal });
  });
}

onPage(({ mm, signal }) => {
  if (!document.querySelector('.case')) return;
  buildRail(signal);
  beforeAfter(signal);
  mm.add({ reduced: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, (context) => {
    const { reduced } = context.conditions as Record<string, boolean>;
    progressBar();
    barCharts(reduced);
    const controller = new AbortController();
    centredVideos(reduced, controller.signal);
    return () => controller.abort();
  });
});
