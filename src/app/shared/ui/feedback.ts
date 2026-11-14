import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'app-feedback',
  template:
    '@if (message()) { <p [class.is-error]="error()" [attr.role]="error() ? \'alert\' : \'status\'">{{ message() }}</p> }',
  styleUrl: './feedback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Feedback {
  readonly message = input('');
  readonly error = input(false);
}
