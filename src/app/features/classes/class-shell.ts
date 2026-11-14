import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { classListReturn } from '../../core/navigation/context';
import { ClassesStore } from './classes.store';
import { ClassNavigationState } from '../../core/navigation/class-navigation-state';
import { StudentRegistration } from './student-registration';

@Component({
  selector: 'app-class-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StudentRegistration],
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
                routerLinkActive="active"
                (isActiveChange)="$event && revealTab(tabLink)"
                [routerLinkActiveOptions]="activeOptions"
                ariaCurrentWhenActive="page"
                ><span class="material-symbols-outlined" aria-hidden="true">{{ tab.icon }}</span
                >{{ tab.title }}</a
              >
            }
            @if (auth.isCoordinator()) {
              <a
                #manageLink
                [routerLink]="['/turmas', id(), 'gerenciar']"
                [queryParams]="{ retorno: back }"
                routerLinkActive="active"
                (isActiveChange)="$event && revealTab(manageLink)"
                [routerLinkActiveOptions]="activeOptions"
                ariaCurrentWhenActive="page"
                ><span class="material-symbols-outlined" aria-hidden="true">settings</span>Gerenciar
                turma</a
              >
            }
          </nav>
        </div>
        @if (section() === 'alunos' && group()?.ativa) {
          <app-student-registration [classId]="id()" />
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
    this.section.set(this.route.firstChild?.snapshot.data['section'] ?? '');
  }
  revealTab(link: HTMLAnchorElement): void {
    link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  readonly activeOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  } as const;
  private readonly navigationState = inject(ClassNavigationState);
  tabParams(section: string) {
    return { ...this.navigationState.params(this.id(), section), retorno: this.back };
  }
  readonly classes = inject(ClassesStore);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly id = computed(() => this.params().get('turma') ?? '');
  readonly group = computed(() => this.classes.get(this.id()));
  readonly back = classListReturn(this.route.snapshot, inject(Router), this.auth.isCoordinator());
  readonly tabs = [
    { path: 'visao-geral', title: 'Visão geral', icon: 'dashboard' },
    { path: 'alunos', title: 'Alunos', icon: 'groups' },
    { path: 'aulas', title: 'Aulas', icon: 'menu_book' },
    { path: 'frequencia', title: 'Frequência', icon: 'event_available' },
    { path: 'avaliacoes', title: 'Avaliações', icon: 'fact_check' },
  ];
}
