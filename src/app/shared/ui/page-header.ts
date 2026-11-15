import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageNavigation } from '../../core/navigation/page-navigation';
import { classListReturnFromUrl } from '../../core/navigation/context';
import { Action } from './action';
import { Breadcrumbs } from './breadcrumbs';

@Component({
  selector: 'app-page-header',
  imports: [Action, RouterLink, Breadcrumbs],
  template: `<header class="page-header">
    <app-breadcrumbs [items]="navigation.page().crumbs" />
    <div class="page-title-row">
      @if (navigation.page().crumbs.length > 1) {
        <a class="back-button" [routerLink]="navigation.back()" aria-label="Voltar" title="Voltar"
          ><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></a
        >
      }
      <h1>{{ navigation.page().title }}</h1>
      @if (classEdit(); as edit) {
        <a
          appAction="edit"
          class="app-button class-edit-action"
          [routerLink]="['/turmas', edit.id, 'gerenciar']"
          [queryParams]="{ retorno: edit.returnTo }"
          >Editar turma</a
        >
      }
    </div>
    @if (navigation.page().context) {
      <p class="page-context">{{ navigation.page().context }}</p>
    }
  </header>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  private readonly router = inject(Router);
  readonly navigation = inject(PageNavigation);
  readonly classEdit = computed(() => {
    const url = this.navigation.url();
    const segments =
      this.router.parseUrl(url).root.children['primary']?.segments.map((segment) => segment.path) ??
      [];
    const classId = segments[0] === 'turmas' ? segments[1] : undefined;
    if (!classId || segments[2] === 'gerenciar') return null;
    return { id: classId, returnTo: classListReturnFromUrl(url, this.router) };
  });
}
