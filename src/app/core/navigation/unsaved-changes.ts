import { Directive, inject, input } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';

export interface UnsavedChanges {
  hasUnsavedChanges(): boolean;
}
export function confirmDiscard(
  component: UnsavedChanges,
  dialog: ConfirmDialogService,
): Promise<boolean> {
  return component.hasUnsavedChanges()
    ? dialog.confirm('Há alterações não salvas. Deseja descartá-las?', {
        title: 'Descartar alterações',
        confirmLabel: 'Descartar',
        confirmIcon: 'undo',
      })
    : Promise.resolve(true);
}
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChanges> = (component) =>
  confirmDiscard(component, inject(ConfirmDialogService));

@Directive({
  selector: '[appUnsavedChanges]',
})
export class UnsavedChangesDirective {
  // The application guard provides a styled confirmation for in-app navigation.
  readonly hasChanges = input(false, { alias: 'appUnsavedChanges' });
}
