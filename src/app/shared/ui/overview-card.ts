import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'article[appOverviewCard]',
  host: { class: 'overview-card' },
  template: `
    <span class="overview-card-icon material-symbols-outlined" aria-hidden="true">{{
      icon()
    }}</span>
    <h2>{{ heading() }}</h2>
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewCard {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
}
