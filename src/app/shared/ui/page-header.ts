import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageNavigation } from '../../core/navigation/page-navigation';
import { classListReturnFromUrl } from '../../core/navigation/context';
import { Action } from './action';
import { Breadcrumbs } from './breadcrumbs';
import { ClassesStore } from '../../features/classes/classes.store';
import { Tooltip } from './tooltip';

@Component({
  selector: 'app-page-header',
  imports: [Action, RouterLink, Breadcrumbs, Tooltip],
  template: `<header class="page-header">
    <app-breadcrumbs [items]="navigation.page().crumbs" />
    <div class="page-title-row">
      @if (navigation.page().crumbs.length > 1) {
        <a class="back-button" [routerLink]="navigation.back()" aria-label="Voltar" title="Voltar"
          ><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></a
        >
      }
      <h1 [attr.aria-label]="navigation.page().title">
        @if (classPin()) {
          <span class="full-title">{{ navigation.page().title }}</span>
          <span class="compact-title">{{ navigation.page().compactTitle }}</span>
        } @else { {{ navigation.page().title }} }
      </h1>
      @if (classPin(); as pin) {
        <button
          appAction="push_pin"
          class="icon-button pin-action"
          [class.is-pinned]="classes.isPinned(pin.id)"
          type="button"
          [attr.aria-pressed]="classes.isPinned(pin.id)"
          [title]="classes.isPinned(pin.id) ? 'Desafixar da tela inicial' : 'Fixar na tela inicial'"
          [attr.aria-label]="(classes.isPinned(pin.id) ? 'Desafixar ' : 'Fixar ') + pin.name"
          (click)="togglePin(pin.id)"
        ></button>
      }
      @if (classEdit(); as edit) {
        <a
          appAction="edit"
          class="icon-button class-edit-action"
          [routerLink]="['/turmas', edit.id, 'gerenciar']"
          [queryParams]="{ retorno: edit.returnTo }"
          aria-label="Editar turma"
          title="Editar turma"
        ></a>
      }
    </div>
    @if (pinMessage()) {
      <p role="status">{{ pinMessage() }}</p>
    }
    @if (navigation.page().context) {
      <p class="page-context">{{ navigation.page().context }}</p>
    }
  </header>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  private readonly router = inject(Router);
  readonly classes = inject(ClassesStore);
  readonly navigation = inject(PageNavigation);
  readonly pinMessage = signal('');
  readonly classPin = computed(() => {
    const url = this.navigation.url();
    const segments =
      this.router.parseUrl(url).root.children['primary']?.segments.map((segment) => segment.path) ??
      [];
    const classId = segments[0] === 'turmas' ? segments[1] : undefined;
    const group = classId ? this.classes.get(classId) : undefined;
    return group ? { id: group.id, name: group.nome } : null;
  });
  async togglePin(id: string): Promise<void> {
    const wasPinned = this.classes.isPinned(id);
    try {
      await this.classes.togglePinned(id);
      this.pinMessage.set(
        wasPinned ? 'Turma removida da tela inicial.' : 'Turma fixada na tela inicial.',
      );
    } catch {
      this.pinMessage.set('Não foi possível atualizar a turma fixada. Tente novamente.');
    }
  }
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
