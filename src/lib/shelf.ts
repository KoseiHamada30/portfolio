// Side Quests shelf (DESIGN.md §5.11). Draggable drives the element's native scrollLeft,
// so wheel/trackpad, touch, keyboard and scroll-snap keep working alongside drag + inertia.
import { gsap, media } from './motion';
import { beforePage, onPage } from './lifecycle';

type DraggableClass = typeof import('gsap/Draggable').Draggable;
let Draggable: DraggableClass | null = null;

// Draggable + InertiaPlugin are fetched only on pages with a shelf.
beforePage(async () => {
  if (Draggable || !document.querySelector('[data-shelf]')) return;
  const [draggable, inertia] = await Promise.all([import('gsap/Draggable'), import('gsap/InertiaPlugin')]);
  Draggable = draggable.Draggable;
  gsap.registerPlugin(Draggable, inertia.InertiaPlugin);
});

onPage(({ mm }) => {
  const shelves = gsap.utils.toArray<HTMLElement>('[data-shelf]');
  if (!shelves.length) return;

  // Touch uses native scrolling; drag is for mouse/trackpad users with full motion.
  mm.add(`${media.motion} and ${media.pointerFine}`, () => {
    if (!Draggable) return;
    const draggables = shelves.flatMap((shelf) =>
      Draggable!.create(shelf, {
        type: 'scrollLeft',
        inertia: true,
        edgeResistance: 0.85,
        dragClickables: true,
        minimumMovement: 6,
        onPress: () => shelf.classList.add('is-dragging'),
        onRelease() {
          if (!this.tween) shelf.classList.remove('is-dragging');
        },
        onThrowComplete: () => shelf.classList.remove('is-dragging'),
      }),
    );
    return () => draggables.forEach((d) => d.kill());
  });
});
