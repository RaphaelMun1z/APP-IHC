import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-list-header',
  template: `<header class="list-header">
    <h2>{{ title() }}</h2>
    <span class="list-result-count" aria-live="polite" aria-atomic="true">
      {{ count() }} {{ count() === 1 ? singular() : plural() }}
    </span>
  </header>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListHeader {
  readonly title = input.required<string>();
  readonly count = input.required<number>();
  readonly singular = input('registro');
  readonly plural = input('registros');
}
