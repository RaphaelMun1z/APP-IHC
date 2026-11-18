import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

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
          (click)="choose(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterOptions {
  private readonly host = inject(ElementRef<HTMLElement>);
  choose(value: string): void {
    this.selectedChange.emit(value);
    this.host.nativeElement.dispatchEvent(new Event('change', { bubbles: true }));
  }
  readonly label = input.required<string>();
  readonly options = input.required<readonly FilterOption[]>();
  readonly selected = input.required<string>();
  readonly selectedChange = output<string>();
}
