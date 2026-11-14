import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageNavigation } from '../../core/navigation/page-navigation';
import { Breadcrumbs } from './breadcrumbs';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Breadcrumbs],
  template: `<header class="page-header">
    <app-breadcrumbs [items]="navigation.page().crumbs" />
    <div class="page-title-row">
      @if (navigation.page().crumbs.length > 1) {
        <a class="back-button" [routerLink]="navigation.back()" aria-label="Voltar" title="Voltar"
          ><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></a
        >
      }
      <h1>{{ navigation.page().title }}</h1>
    </div>
    @if (navigation.page().context) {
      <p class="page-context">{{ navigation.page().context }}</p>
    }
  </header>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly navigation = inject(PageNavigation);
}
