import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  host: { class: 'list-skeleton', role: 'status' },
  template: '<span class="sr-only">{{ label() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeleton {
  readonly label = input('Carregando dados…');
}
