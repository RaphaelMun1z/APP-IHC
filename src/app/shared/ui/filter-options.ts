import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-filter-options',
  template: `
    <div class="filter-option-group" role="group" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="filter-option"
          [class.selected]="selected() === option.value"
          [attr.aria-pressed]="selected() === option.value"
          (click)="selectedChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterOptions {
  readonly label = input.required<string>();
  readonly options = input.required<readonly FilterOption[]>();
  readonly selected = input.required<string>();
  readonly selectedChange = output<string>();
}
