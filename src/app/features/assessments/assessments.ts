import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { Action } from '../../shared/ui/action';
import { contextParam, returnTo } from '../../core/navigation/context';
import { AuthService } from '../../core/auth/auth.service';
import { ClassNavigationState } from '../../core/navigation/class-navigation-state';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { AssessmentMark, StudentAssessment } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { AssessmentsStore, nextAssessment } from './assessments.store';
import { UnsavedChangesDirective, confirmDiscard } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { formatDate, localDate, requirePastDate } from '../../shared/utils/dates';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = this.route.snapshot.queryParamMap;
  readonly fixedClass = this.route.snapshot.pathFromRoot.some((node) => node.paramMap.has('turma'));
  readonly contextClass = contextParam(this.route.snapshot, 'turma');
  readonly back = returnTo(
    this.route.snapshot,
    this.contextClass ? `/turmas/${this.contextClass}/visao-geral` : '/turmas',
    inject(AuthService).isCoordinator(),
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.contextClass ?? this.classes.active()[0]?.id ?? '',
    data: this.params.get('data') ?? localDate(),
  });
  readonly applied = signal(this.form.getRawValue());
  readonly group = computed(() => this.classes.get(this.applied().turmaId));
  readonly rows = signal<readonly StudentAssessment[]>(
    this.store.roster(this.applied().turmaId, this.applied().data),
  );
  readonly today = localDate();
  readonly formatDate = formatDate;
  readonly dirty = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  constructor() {
    this.rememberDate();
  }
  private rememberDate(): void {
    if (this.fixedClass)
      this.navigationState.remember(this.applied().turmaId, 'avaliacoes', this.applied().data);
  }
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  load(): void {
    if (!confirmDiscard(this)) {
      this.form.setValue(this.applied());
      return;
    }
    try {
      requirePastDate(this.form.controls.data.value);
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
      this.form.setValue(this.applied());
      return;
    }
    this.applied.set(this.form.getRawValue());
    this.paging.page.set(1);
    this.rememberDate();
    this.rows.set(this.store.roster(this.applied().turmaId, this.applied().data));
    this.dirty.set(false);
    this.message.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { data: this.applied().data },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  cycle(studentId: string, criterionId: string): void {
    if (!this.group()?.ativa) return;
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
    try {
      this.store.save(this.applied().turmaId, this.applied().data, this.rows());
      this.dirty.set(false);
      this.isError.set(false);
      this.message.set('Avaliação salva. O registro já está disponível no histórico.');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = inject(Router).parseUrl(this.back);

  readonly paging = new TablePage(() => this.rows().length);
  readonly visibleRows = computed(() => this.paging.slice(this.rows()));
  readonly chips = computed(() => [
    ...(this.applied().data !== this.today
      ? [{ key: 'period', label: 'Data', value: this.formatDate(this.applied().data) }]
      : []),
    ...(!this.fixedClass &&
    this.applied().turmaId !== (this.contextClass ?? this.classes.active()[0]?.id ?? '')
      ? [{ key: 'turma', label: 'Turma', value: this.group()?.nome ?? 'Turma' }]
      : []),
  ]);
  resetFilters(): void {
    this.form.patchValue({
      turmaId: this.contextClass ?? this.classes.active()[0]?.id ?? '',
      data: this.today,
    });
    this.load();
  }
  removeFilter(key: string): void {
    if (key === 'turma')
      this.form.controls.turmaId.setValue(this.contextClass ?? this.classes.active()[0]?.id ?? '');
    else {
      this.form.controls.data.setValue(this.today);
    }
    this.load();
  }
}
