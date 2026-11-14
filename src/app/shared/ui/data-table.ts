import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Keep native table semantics inside a named, keyboard-accessible scroll region. */
@Component({
  selector: 'app-data-table',
  host: { class: 'table-scroll', role: 'region', tabindex: '0', '[attr.aria-label]': 'label()' },
  template: '<ng-content />',
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  readonly label = input.required<string>();
}
