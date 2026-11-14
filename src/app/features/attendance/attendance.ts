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
import type { AttendanceDay, AttendanceMark } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { AttendanceStore, attendanceColumns, nextAttendance } from './attendance.store';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { isDate, localDate } from '../../shared/utils/dates';
import { UnsavedChangesDirective, confirmDiscard } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';

@Component({
  selector: 'app-attendance',
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
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Attendance implements UnsavedChanges {
  private readonly navigationState = inject(ClassNavigationState);
  readonly classes = inject(ClassesStore);
  private readonly store = inject(AttendanceStore);
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
  private readonly initialDate = this.params.get('data');
  private readonly date =
    this.initialDate && isDate(this.initialDate)
      ? new Date(`${this.initialDate}T12:00:00`)
      : new Date();
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.contextClass ?? this.classes.active()[0]?.id ?? '',
    year: this.date.getFullYear(),
    month: this.date.getMonth() + 1,
  });
  readonly applied = signal(this.form.getRawValue());
  readonly group = computed(() => this.classes.get(this.applied().turmaId));
  readonly roster = computed(() => this.classes.roster(this.applied().turmaId));
  readonly columns = computed(() =>
    attendanceColumns(
      this.applied().year,
      this.applied().month,
      this.group()?.dias ?? [],
      Object.keys(this.store.records()[this.applied().turmaId] ?? {}),
    ),
  );
  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(this.applied().year, this.applied().month - 1, 1),
    ),
  );
  readonly months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, index, 1)),
  }));
  readonly years = computed(() =>
    [
      ...new Set([
        new Date().getFullYear(),
        new Date().getFullYear() - 1,
        this.date.getFullYear(),
        ...Object.values(this.store.records()).flatMap((dates) =>
          Object.keys(dates).map((date) => Number(date.slice(0, 4))),
        ),
      ]),
    ].sort((a, b) => b - a),
  );
  readonly draft = signal<Readonly<Record<string, AttendanceDay>>>({});
  readonly dirty = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  constructor() {
    this.rememberPeriod();
  }
  private rememberPeriod(): void {
    if (this.fixedClass)
      this.navigationState.remember(
        this.applied().turmaId,
        'frequencia',
        `${this.applied().year}-${String(this.applied().month).padStart(2, '0')}-01`,
      );
  }
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  search(): void {
    if (!confirmDiscard(this)) {
      this.form.setValue(this.applied());
      return;
    }
    this.applied.set(this.form.getRawValue());
    this.paging.page.set(1);
    this.rememberPeriod();
    this.draft.set({});
    this.dirty.set(false);
    this.message.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        data: `${this.applied().year}-${String(this.applied().month).padStart(2, '0')}-01`,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  mark(studentId: string, date: string): AttendanceMark {
    return (
      this.draft()[date]?.[studentId] ??
      (Object.hasOwn(this.draft()[date] ?? {}, studentId)
        ? null
        : (this.store.records()[this.applied().turmaId]?.[date]?.[studentId] ?? null))
    );
  }
  cycle(studentId: string, date: string): void {
    if (!this.group()?.ativa || date > localDate()) return;
    const day = Object.fromEntries(
      this.roster().map((student) => [student.id, this.mark(student.id, date)]),
    );
    this.draft.update((draft) => ({
      ...draft,
      [date]: { ...day, [studentId]: nextAttendance(this.mark(studentId, date)) },
    }));
    this.dirty.set(true);
    this.message.set('');
  }
  label(mark: AttendanceMark): string {
    return mark === 'presente' ? 'Presente' : mark === 'falta' ? 'Falta' : 'Sem registro';
  }
  summary(studentId: string): string {
    const marks = this.columns().map((column) => this.mark(studentId, column.date));
    return `${marks.filter((mark) => mark === 'presente').length} / ${marks.filter((mark) => mark !== null).length}`;
  }
  save(): void {
    try {
      this.store.saveMonth(this.applied().turmaId, this.draft());
      this.dirty.set(false);
      this.draft.set({});
      this.isError.set(false);
      this.message.set('Frequência salva. Os registros já estão disponíveis no histórico.');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = inject(Router).parseUrl(this.back);

  readonly paging = new TablePage(() => this.roster().length);
  readonly visibleRows = computed(() => this.paging.slice(this.roster()));
  readonly chips = computed(() => [
    ...(this.applied().year !== new Date().getFullYear() ||
    this.applied().month !== new Date().getMonth() + 1
      ? [{ key: 'period', label: 'Período', value: this.monthLabel() }]
      : []),
    ...(!this.fixedClass &&
    this.applied().turmaId !== (this.contextClass ?? this.classes.active()[0]?.id ?? '')
      ? [{ key: 'turma', label: 'Turma', value: this.group()?.nome ?? 'Turma' }]
      : []),
  ]);
  resetFilters(): void {
    this.form.patchValue({
      turmaId: this.contextClass ?? this.classes.active()[0]?.id ?? '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    });
    this.search();
  }
  removeFilter(key: string): void {
    if (key === 'turma')
      this.form.controls.turmaId.setValue(this.contextClass ?? this.classes.active()[0]?.id ?? '');
    else {
      this.form.patchValue({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    }
    this.search();
  }
}
