import { Action } from '../../shared/ui/action';
import { ClassesStore } from '../classes/classes.store';
import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { contextParam } from '../../core/navigation/context';
import { LessonsStore } from './lessons.store';
import { LessonTabs } from './lesson-tabs';
import { filter, map } from 'rxjs';
import { animateRouteView } from '../../core/navigation/page-transition';

@Component({
  selector: 'app-lesson-workspace',
  imports: [Action, LessonTabs, RouterLink, RouterOutlet],
  template: `
    <div class="lesson-workspace">
      @if (lesson(); as item) {
        <div class="lesson-navigation">
          <app-lesson-tabs [classId]="item.turmaId" [lessonId]="item.id" [date]="item.data" />
          @if (classes.get(item.turmaId)?.ativa && classes.canTeach(item.turmaId) && overviewOpen()) {
            <a
              appAction="edit"
              class="app-button primary lesson-edit-button"
              [routerLink]="['/turmas', item.turmaId, 'aulas', item.id, 'editar']"
              [queryParams]="{ retorno: currentUrl }"
              >Editar aula</a
            >
          }
        </div>
        <router-outlet (activate)="animateSection()" />
      } @else {
        <main class="app-page surface content-scroll record-page">
          <p class="app-empty" role="status">A aula não existe ou pertence a outra turma.</p>
        </main>
      }
    </div>
  `,
  styleUrl: './lesson-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly lessons = inject(LessonsStore);
  readonly classes = inject(ClassesStore);
  animateSection(): void {
    animateRouteView('.lesson-workspace > router-outlet + *');
  }
  private readonly router = inject(Router);
  private readonly activeUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly classId = contextParam(this.route.snapshot, 'turma');
  get currentUrl(): string {
    return navigationUrl(this.router);
  }
  readonly overviewOpen = computed(() => {
    this.activeUrl();
    return this.route.firstChild?.snapshot.routeConfig?.path === '';
  });
  readonly lesson = computed(() => {
    const id = this.params().get('id');
    return this.lessons.records().find((item) => item.id === id && item.turmaId === this.classId);
  });
}
