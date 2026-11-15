import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

/** Keep native buttons/links, routing, disabled state and keyboard behavior. */
@Directive({ selector: 'button[appAction], a[appAction]' })
export class Action {
  readonly icon = input.required<string>({ alias: 'appAction' });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  constructor() {
    const icon = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(icon, 'material-symbols-outlined');
    this.renderer.setAttribute(icon, 'aria-hidden', 'true');
    this.renderer.addClass(this.element.nativeElement, 'action-control');
    this.renderer.insertBefore(
      this.element.nativeElement,
      icon,
      this.element.nativeElement.firstChild,
    );
    effect(() => {
      const action = this.icon();
      this.renderer.setProperty(icon, 'textContent', action);
      this.renderer.setAttribute(this.element.nativeElement, 'data-action', action);
    });
  }
}
