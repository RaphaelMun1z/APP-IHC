import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'app-badge',
  template: `<span class="table-badge" [attr.data-tone]="tone()"><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly tone = input('neutral');
}
