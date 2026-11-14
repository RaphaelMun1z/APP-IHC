import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
export interface FilterChip {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}
let filterPanelId = 0;

@Component({
  selector: 'app-filter-panel',
  template: `<section class="filter-shell" aria-label="Filtros da listagem">
    <div class="filter-toolbar">
      @if (searchable()) {
        <div class="filter-search-box">
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
          <div class="filter-search-slot"><ng-content select="[filter-search]" /></div>
        </div>
      }
      @if (context()) {
        <button
          class="filter-context"
          type="button"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="contentId"
          (click)="expanded.set(!expanded())"
        >
          <span class="material-symbols-outlined" aria-hidden="true">calendar_month</span>
          {{ context() }}
          <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
        </button>
      }
      @if (refinable()) {
        <button
          class="filter-toggle"
          type="button"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="contentId"
          (click)="expanded.set(!expanded())"
        >
          <span class="material-symbols-outlined" aria-hidden="true">filter_list</span
          ><span class="filter-button-label">Filtros</span
          ><span class="filter-count" [hidden]="!activeCount()">{{ activeCount() }}</span>
        </button>
      }
      @if (activeCount() || expanded()) {
        <button class="filter-clear" type="button" (click)="clearFilters.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
          Limpar
        </button>
      }
      <div class="filter-toolbar-actions"><ng-content select="[filter-actions]" /></div>
    </div>
    @if (chips().length) {
      <div class="filter-chip-row">
        <div class="filter-chips" aria-label="Filtros ativos">
          @for (chip of chips(); track chip.key) {
            <span class="filter-chip">
              <span class="filter-chip-label">{{ chip.label }}:</span>
              <span class="filter-chip-value">{{ chip.value }}</span>
              <button
                type="button"
                class="filter-chip-remove"
                [attr.aria-label]="'Remover filtro ' + chip.label + ': ' + chip.value"
                [attr.title]="'Remover filtro ' + chip.label + ': ' + chip.value"
                (click)="removeFilter.emit(chip.key)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </span>
          }
        </div>
      </div>
    }
    <div [id]="contentId" class="filter-content" [hidden]="!expanded()">
      <ng-content />
      <div class="filter-panel-actions">
        <button class="filter-apply" type="button" (click)="applyFilters.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">check</span>Aplicar
        </button>
      </div>
    </div>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPanel {
  readonly contentId = `filter-panel-${++filterPanelId}`;
  readonly activeCount = input(0);
  readonly chips = input<readonly FilterChip[]>([]);
  readonly searchable = input(false);
  readonly refinable = input(true);
  readonly context = input('');
  readonly removeFilter = output<string>();
  readonly clearFilters = output<void>();
  readonly applyFilters = output<void>();
  readonly expanded = signal(false);
}
