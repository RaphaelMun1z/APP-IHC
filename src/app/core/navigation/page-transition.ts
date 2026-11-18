import { gsap } from 'gsap';

/** Animate the newly activated route view, unless the user prefers less motion. */
export function animateRouteView(selector: string): void {
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const view = document.querySelector<HTMLElement>(selector);
  if (!view) return;

  gsap.fromTo(
    view,
    { autoAlpha: 0, y: 12 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.38,
      ease: 'power2.out',
      clearProps: 'all',
      overwrite: true,
    },
  );
}
