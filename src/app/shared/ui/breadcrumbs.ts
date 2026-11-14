import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BreadcrumbItem } from '../../core/navigation/page-navigation';

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  template: `<nav aria-label="Breadcrumb">
    <ol class="breadcrumbs">
      @for (item of items(); track $index) {
        <li>
          @if (!$first) {
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          }
          @if ($last) {
            <span aria-current="page">{{ item.label }}</span>
          } @else {
            <a [routerLink]="item.url">{{ item.label }}</a>
          }
        </li>
      }
    </ol>
  </nav>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Breadcrumbs {
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
