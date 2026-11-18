import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tooltip } from './tooltip';

const PAGE_SIZES = [10, 15, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

export class TablePage {
  readonly page = signal(1);
  readonly size = signal(DEFAULT_PAGE_SIZE);
  constructor(private readonly count: () => number) {}
  readonly current = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.count() / this.size()))),
  );
  slice<T>(values: readonly T[]): readonly T[] {
    return values.slice((this.current() - 1) * this.size(), this.current() * this.size());
  }
  resize(size: number): void {
    this.size.set(size);
    this.page.set(1);
  }
}
@Component({
  selector: 'app-pagination',
  imports: [FormsModule, Tooltip],
  template: `<footer class="pagination">
    <div class="pagination-info">
      <label
        >Por página
        <select
          aria-label="Registros por página"
          [ngModel]="size()"
          (ngModelChange)="sizeChange.emit($event)"
        >
          @for (value of pageSizes; track value) {
            <option [ngValue]="value">{{ value }}</option>
          }
        </select></label
      >
    </div>
    <nav aria-label="Paginação">
      <button
        type="button"
        title="Primeira página"
        aria-label="Primeira página"
        [disabled]="current() === 1"
        (click)="pageChange.emit(1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">first_page</span></button
      ><button
        type="button"
        title="Anterior"
        aria-label="Anterior"
        [disabled]="current() === 1"
        (click)="pageChange.emit(current() - 1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button
      ><span class="pagination-current" aria-current="page">{{ current() }} / {{ pages() }}</span
      ><button
        type="button"
        title="Próxima"
        aria-label="Próxima"
        [disabled]="current() === pages()"
        (click)="pageChange.emit(current() + 1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button
      ><button
        type="button"
        title="Última página"
        aria-label="Última página"
        [disabled]="current() === pages()"
        (click)="pageChange.emit(pages())"
      >
        <span class="material-symbols-outlined" aria-hidden="true">last_page</span>
      </button>
    </nav>
  </footer>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly total = input.required<number>();
  readonly page = input(1);
  readonly size = input(DEFAULT_PAGE_SIZE);
  readonly pageSizes = PAGE_SIZES;
  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly current = computed(() => Math.min(this.page(), this.pages()));
}
