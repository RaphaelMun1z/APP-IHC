import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { classListReturn } from '../../core/navigation/context';
import { ClassesStore } from './classes.store';
import { ClassNavigationState } from '../../core/navigation/class-navigation-state';
import { Action } from '../../shared/ui/action';

@Component({
  selector: 'app-class-shell',
  imports: [Action, RouterLink, RouterOutlet],
  styleUrl: './class-shell.scss',
  template: `
    <div class="class-workspace">
      <div class="class-tabs-toolbar">
        <div class="context-tabs-scroll">
          <nav class="context-tabs" aria-label="Navegação da turma">
            @for (tab of tabs; track tab.path) {
              <a
                #tabLink
                [routerLink]="['/turmas', id(), tab.path]"
                [queryParams]="tabParams(tab.path)"
                [class.active]="isSelected(tab.path)"
                [attr.aria-current]="isSelected(tab.path) ? 'page' : null"
                (click)="revealTab(tabLink)"
                ><span class="material-symbols-outlined" aria-hidden="true">{{ tab.icon }}</span
                >{{ tab.title }}</a
              >
            }
          </nav>
        </div>
        @if (section() === 'alunos' && group()?.ativa) {
          <a
            appAction="person_add"
            class="app-button primary class-toolbar-action"
            [routerLink]="['/turmas', id(), 'alunos', 'novo']"
            [queryParams]="{ retorno: studentListUrl() }"
            >Cadastrar aluno</a
          >
        } @else if (isSelected('aulas') && group()?.ativa) {
          <a
            appAction="add"
            class="app-button primary class-toolbar-action"
            [routerLink]="['/turmas', id(), 'aulas', 'nova']"
            [queryParams]="{ retorno: back }"
            >Registrar aula</a
          >
        }
      </div>

      <router-outlet (activate)="updateSection()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassShell {
  readonly section = signal('');
  updateSection(): void {
    const segments =
      this.router
        .parseUrl(this.router.url)
        .root.children['primary']?.segments.map((segment) => segment.path) ?? [];
    const section = segments[2] ?? '';
    this.section.set(
      section === 'alunos' && segments[3] === 'novo'
        ? 'student-registration'
        : section === 'registros'
          ? 'lesson'
          : section,
    );
  }
  revealTab(link: HTMLAnchorElement): void {
    link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  isSelected(path: string): boolean {
    return (
      this.section() === path ||
      (path === 'alunos' && this.section() === 'student-registration') ||
      (path === 'aulas' && this.section() === 'lesson')
    );
  }
  private readonly navigationState = inject(ClassNavigationState);
  private readonly router = inject(Router);
  tabParams(section: string) {
    return { ...this.navigationState.params(this.id(), section), retorno: this.back };
  }
  readonly classes = inject(ClassesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly id = computed(() => this.params().get('turma') ?? '');
  readonly group = computed(() => this.classes.get(this.id()));
  readonly studentListUrl = computed(() => `/turmas/${this.id()}/alunos`);
  readonly back = classListReturn(this.route.snapshot, inject(Router));
  readonly tabs = [
    { path: 'visao-geral', title: 'Visão geral', icon: 'dashboard' },
    { path: 'alunos', title: 'Alunos', icon: 'groups' },
    { path: 'aulas', title: 'Aulas', icon: 'menu_book' },
  ];
}
