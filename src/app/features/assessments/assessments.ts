import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { Action } from '../../shared/ui/action';
import { contextParam, navigationUrl, returnTo } from '../../core/navigation/context';
import { ClassNavigationState } from '../../core/navigation/class-navigation-state';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { AssessmentMark, StudentAssessment } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { AssessmentsStore, nextAssessment } from './assessments.store';
import { LessonsStore } from '../lessons/lessons.store';
import { UnsavedChangesDirective, confirmDiscard } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { formatDate } from '../../shared/utils/dates';

@Component({
  selector: 'app-assessments',
  imports: [
    Pagination,
    ListHeader,
    PersonAvatar,
    DataTable,
    FilterPanel,
    Action,
    ReactiveFormsModule,
    RouterLink,
    Feedback,
    UnsavedChangesDirective,
  ],
  templateUrl: './assessments.html',
  styleUrl: './assessments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Assessments implements UnsavedChanges {
  private readonly navigationState = inject(ClassNavigationState);
  readonly classes = inject(ClassesStore);
  readonly store = inject(AssessmentsStore);
  readonly lessons = inject(LessonsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = this.route.snapshot.queryParamMap;
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly fixedClass = this.route.snapshot.pathFromRoot.some((node) => node.paramMap.has('turma'));
  readonly contextClass = contextParam(this.route.snapshot, 'turma');
  readonly back = returnTo(
    this.route.snapshot,
    this.contextClass ? `/turmas/${this.contextClass}/avaliacoes` : '/turmas',
  );
  readonly currentUrl = navigationUrl(this.router);
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.contextClass ?? this.params.get('turma') ?? this.classes.active()[0]?.id ?? '',
  });
  readonly applied = signal(this.form.getRawValue());
  readonly selectedLessonId = computed(() => {
    const query = this.queryParams();
    const requestedLesson =
      this.route.snapshot.paramMap.get('aulaId') ??
      contextParam(this.route.snapshot, 'id') ??
      query.get('aula') ??
      '';
    const legacyDate = query.get('data') ?? '';
    return (
      requestedLesson ||
      (legacyDate
        ? (this.lessons
            .records()
            .find(
              (lesson) =>
                lesson.turmaId === (this.contextClass ?? this.applied().turmaId) &&
                lesson.data === legacyDate,
            )?.id ?? '')
        : '')
    );
  });
  readonly selectedLesson = computed(() => {
    const lesson = this.lessons.records().find((item) => item.id === this.selectedLessonId());
    return lesson && (!this.contextClass || lesson.turmaId === this.contextClass)
      ? lesson
      : undefined;
  });
  readonly group = computed(() =>
    this.classes.get(this.selectedLesson()?.turmaId ?? this.applied().turmaId),
  );
  readonly listLessons = computed(() =>
    this.lessons
      .records()
      .filter((lesson) =>
        this.contextClass
          ? lesson.turmaId === this.contextClass
          : lesson.turmaId === this.applied().turmaId,
      )
      .sort((a, b) => b.data.localeCompare(a.data)),
  );
  readonly rows = signal<readonly StudentAssessment[]>([]);
  readonly formatDate = formatDate;
  readonly dirty = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  constructor() {
    let activeLessonId = '';
    effect(() => {
      const lesson = this.selectedLesson();
      const lessonId = lesson?.id ?? '';
      if (lessonId === activeLessonId) return;
      activeLessonId = lessonId;
      this.rows.set(lesson ? this.store.roster(lesson.id) : []);
      this.paging.page.set(1);
      this.dirty.set(false);
      this.message.set('');
      this.rememberDate();
    });
  }
  private rememberDate(): void {
    const lesson = this.selectedLesson();
    if (this.fixedClass && lesson)
      this.navigationState.remember(lesson.turmaId, 'avaliacoes', lesson.data);
  }
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  load(): void {
    if (!confirmDiscard(this)) {
      this.form.setValue(this.applied());
      return;
    }
    this.applied.set(this.form.getRawValue());
    this.lessonPaging.page.set(1);
    this.dirty.set(false);
    this.message.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { turma: this.applied().turmaId || null, data: null, aula: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  cycle(studentId: string, criterionId: string): void {
    if (!this.selectedLesson() || !this.group()?.ativa) return;
    this.rows.update((rows) =>
      rows.map((student) =>
        student.id === studentId
          ? {
              ...student,
              avaliacoes: {
                ...student.avaliacoes,
                [criterionId]: nextAssessment(student.avaliacoes[criterionId] ?? null),
              },
            }
          : student,
      ),
    );
    this.dirty.set(true);
    this.message.set('');
  }
  label(mark: AssessmentMark | undefined): string {
    return mark === 'ok'
      ? 'Atendeu ao critério'
      : mark === 'nao-ok'
        ? 'Precisa desenvolver'
        : 'Sem avaliação';
  }
  save(): void {
    const lesson = this.selectedLesson();
    if (!lesson) {
      this.isError.set(true);
      this.message.set('Selecione uma aula para salvar a avaliação.');
      return;
    }
    try {
      this.store.save(lesson.id, this.rows());
      this.dirty.set(false);
      this.isError.set(false);
      this.message.set('Avaliação salva e vinculada à aula.');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = this.router.parseUrl(this.back);
  readonly lessonPaging = new TablePage(() => this.listLessons().length);
  readonly visibleLessons = computed(() => this.lessonPaging.slice(this.listLessons()));
  readonly paging = new TablePage(() => this.rows().length);
  readonly visibleRows = computed(() => this.paging.slice(this.rows()));
  readonly chips = computed(() => [
    ...(!this.fixedClass &&
    this.applied().turmaId !== (this.params.get('turma') ?? this.classes.active()[0]?.id ?? '')
      ? [
          {
            key: 'turma',
            label: 'Turma',
            value: this.classes.get(this.applied().turmaId)?.nome ?? 'Turma',
          },
        ]
      : []),
  ]);
  readonly unlinkedLegacy = computed(() =>
    this.store
      .unlinkedLegacy()
      .filter((item) =>
        this.contextClass
          ? item.classId === this.contextClass
          : item.classId === this.applied().turmaId,
      ),
  );
  readonly legacyPaging = new TablePage(() => this.unlinkedLegacy().length);
  readonly visibleLegacy = computed(() => this.legacyPaging.slice(this.unlinkedLegacy()));
  resetFilters(): void {
    this.form.patchValue({ turmaId: this.contextClass ?? this.classes.active()[0]?.id ?? '' });
    this.load();
  }
  removeFilter(key: string): void {
    if (key === 'turma')
      this.form.controls.turmaId.setValue(this.contextClass ?? this.classes.active()[0]?.id ?? '');
    this.load();
  }
}
