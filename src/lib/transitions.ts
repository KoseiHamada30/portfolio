// Page transitions (Phase 10, DESIGN.md §8.4 "Stage & Sheet"). Astro's ClientRouter runs the
// browser's View Transition; this module only decides which kind it is and marks <html data-vt>,
// and motion.css animates ::view-transition-old/new(root) for that kind:
//   open    Work → case study: the sheet rises from the bottom over the dimmed slider
//   close   case study → Work (Close or Back): the sheet slides down, the slider brightens back
//   next    case study → NextProject: the current sheet lifts away, the next one rises
//   prev    Back from a NextProject: the reverse of next
//   section Work ↔ About: crossfade (stage ↔ paper colour); the nav bar slides (nav.ts)
//   lang    language switch: short crossfade
//   cut     About → Work hand-off (?from=about): no transition, the splash exit takes over
// The nav has its own view-transition-name and shows live, so it never slides with a sheet.

export type TransitionKind = 'open' | 'close' | 'next' | 'prev' | 'section' | 'lang' | 'cut';

type Place = 'work' | 'case' | 'about' | 'other';

function place(target: URL): Place {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = target.pathname.slice(base.length).replace(/^\/+|\/+$/g, '').replace(/^ja(\/|$)/, '');
  if (path === '') return 'work';
  if (path.startsWith('work/')) return 'case';
  if (path.startsWith('about')) return 'about';
  return 'other';
}

export function transitionKind(from: URL, to: URL, back: boolean, fromLangToggle: boolean): TransitionKind | null {
  if (fromLangToggle) return 'lang';
  if (to.searchParams.get('from') === 'about') return 'cut';
  const a = place(from);
  const b = place(to);
  if (a === 'work' && b === 'case') return 'open';
  if (a === 'case' && b === 'work') return 'close';
  if (a === 'case' && b === 'case') return back ? 'prev' : 'next';
  if ((a === 'about' && (b === 'work' || b === 'case')) || (b === 'about' && (a === 'work' || a === 'case'))) return 'section';
  return null;
}

/** The kind of transition that brought in the current page (null on a full load). */
export function arrivedBy(): TransitionKind | null {
  return (document.documentElement.dataset.vt as TransitionKind | undefined) ?? null;
}

let started = false;

export function startTransitions(): void {
  if (started) return;
  started = true;

  let kind: TransitionKind | null = null;
  document.addEventListener('astro:before-preparation', (event) => {
    kind = transitionKind(
      event.from,
      event.to,
      event.direction === 'back',
      Boolean(event.sourceElement?.closest('[data-lang-toggle]')),
    );
    const html = document.documentElement;
    if (kind) html.dataset.vt = kind;
    else delete html.dataset.vt;
  });
  document.addEventListener('astro:before-swap', (event) => {
    // The swap copies <html> attributes from the new document, so mark it there too.
    if (kind) event.newDocument.documentElement.dataset.vt = kind;
  });
  // A full page load starts with no kind.
  document.addEventListener('astro:page-load', () => {
    if (!kind) delete document.documentElement.dataset.vt;
    kind = null;
  });
}
