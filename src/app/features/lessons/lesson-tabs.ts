import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { navigationUrl } from '../../core/navigation/context';

@Component({
  selector: 'app-lesson-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="context-tabs-scroll lesson-context-tabs" aria-label="Abas da aula">
      <div class="context-tabs">
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="link(tab.path)"
            [queryParams]="queryParams(tab.path)"
            routerLinkActive="active"
            [routerLinkActiveOptions]="tab.path ? subsetMatch : exactMatch"
            ariaCurrentWhenActive="page"
            ><span class="material-symbols-outlined" aria-hidden="true">{{ tab.icon }}</span
            >{{ tab.label }}</a
          >
        }
      </div>
    </nav>
  `,
  styleUrl: './lesson-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonTabs {
  readonly classId = input.required<string>();
  readonly lessonId = input.required<string>();
  readonly date = input.required<string>();
  private readonly returnUrl = navigationUrl(inject(Router));
  readonly subsetMatch = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  } as const;
  readonly exactMatch = {
    ...this.subsetMatch,
    paths: 'exact',
  } as const;
  readonly tabs = [
    { path: '', label: 'Aula', icon: 'menu_book' },
    { path: 'frequencia', label: 'Frequência', icon: 'event_available' },
    { path: 'avaliacoes', label: 'Avaliações', icon: 'fact_check' },
  ];

  link(path: string): string[] {
    const base = ['/turmas', this.classId(), 'registros', this.lessonId()];
    return path ? [...base, path] : base;
  }

  queryParams(path: string): Record<string, string> {
    return {
      ...(path === 'frequencia' ? { data: this.date() } : {}),
      retorno: this.returnUrl,
    };
  }
}
