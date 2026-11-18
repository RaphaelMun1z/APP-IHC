import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { Tooltip } from './tooltip';
import { gsap } from 'gsap';
interface FilterChip {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}
let filterPanelId = 0;

@Component({
  selector: 'app-filter-panel',
  imports: [Tooltip],
  template: `<section class="filter-shell" aria-label="Filtros da listagem">
    <div class="filter-toolbar">
      @if (searchable()) {
        <div class="filter-search-box" (input)="applyFilters.emit()">
          <div class="filter-search-slot"><ng-content select="[filter-search]" /></div>
          <span class="material-symbols-outlined" aria-hidden="true">search</span>
        </div>
      }
      @if (context()) {
        <button
          class="filter-context"
          type="button"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="contentId"
          (click)="toggleFilters()"
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
          [attr.aria-label]="activeCount() ? 'Filtros, ' + activeCount() + ' ativos' : 'Filtros'"
          [title]="activeCount() ? 'Filtros (' + activeCount() + ' ativos)' : 'Filtros'"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="contentId"
          (click)="toggleFilters()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
        </button>
      }
      @if (activeCount() || expanded()) {
        <button
          class="filter-clear"
          type="button"
          aria-label="Limpar filtros"
          title="Limpar filtros"
          (click)="clearAndClose()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
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
                [title]="'Remover filtro ' + chip.label + ': ' + chip.value"
                (click)="removeFilter.emit(chip.key)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </span>
          }
        </div>
      </div>
    }
    <div
      #filterContent
      [id]="contentId"
      class="filter-content"
      [hidden]="!expanded()"
      (change)="applyFilters.emit()"
    >
      <ng-content />
    </div>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPanel {
  @ViewChild('filterContent') private filterContent?: ElementRef<HTMLDivElement>;
  private filterTween?: gsap.core.Tween;
  private expandedTarget = false;
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

  toggleFilters(): void {
    this.setExpanded(!this.expandedTarget);
  }

  private setExpanded(open: boolean): void {
    this.expandedTarget = open;
    this.filterTween?.kill();
    const element = this.filterContent?.nativeElement;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.expanded.set(open);
      return;
    }

    if (open) {
      this.expanded.set(true);
      element.hidden = false;
      this.filterTween = gsap.fromTo(
        element,
        { height: 0, autoAlpha: 0, y: -6 },
        {
          height: 'auto',
          autoAlpha: 1,
          y: 0,
          duration: 0.24,
          ease: 'power2.out',
          onComplete: () => gsap.set(element, { clearProps: 'height,opacity,visibility,transform' }),
        },
      );
      return;
    }

    this.filterTween = gsap.to(element, {
      height: 0,
      autoAlpha: 0,
      y: -6,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        this.expanded.set(false);
        gsap.set(element, { clearProps: 'height,opacity,visibility,transform' });
      },
    });
  }

  clearAndClose(): void {
    this.clearFilters.emit();
    if (this.expandedTarget) this.setExpanded(false);
  }
}
