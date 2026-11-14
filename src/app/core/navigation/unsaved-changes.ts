import { Directive, input } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

export interface UnsavedChanges {
  hasUnsavedChanges(): boolean;
}
export function confirmDiscard(component: UnsavedChanges): boolean {
  return (
    !component.hasUnsavedChanges() ||
    window.confirm('Há alterações não salvas. Deseja descartá-las?')
  );
}
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChanges> = (component) =>
  confirmDiscard(component);

@Directive({
  selector: '[appUnsavedChanges]',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class UnsavedChangesDirective {
  // Bound by the component so browser refresh and Angular navigation share the same state.
  readonly hasChanges = input(false, { alias: 'appUnsavedChanges' });
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges()) event.preventDefault();
  }
}
