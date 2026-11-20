import { OverviewCard } from '../../shared/ui/overview-card';
import { requiredText } from '../../shared/utils/form-validators';
import { Action } from '../../shared/ui/action';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { Badge } from '../../shared/ui/badge';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { navigationUrl } from '../../core/navigation/context';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import type { Student } from '../../core/models/domain';
import { lessonTypes } from '../../core/models/domain';
import { HistoryStore } from '../history/history.store';
import { ClassesStore } from './classes.store';
import { contextParam } from '../../core/navigation/context';
import { formatDate, isDate } from '../../shared/utils/dates';
import { enrollments, teachingAssignments } from '../../core/data/academic-records';
import type { SchoolClass } from '../../core/models/domain';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { AttendanceStore } from '../attendance/attendance.store';
import { DataTable } from '../../shared/ui/data-table';
import { Modal } from '../../shared/ui/modal';
import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';
import { Tooltip } from '../../shared/ui/tooltip';
import { FilterOptions, type FilterOption } from '../../shared/ui/filter-options';

@Component({
  selector: 'app-class-details',
  imports: [
    OverviewCard,
    Tooltip,
    FilterOptions,
    Action,
    Badge,
    DataTable,
    FilterPanel,
    FormsModule,
    ListHeader,
    PersonAvatar,
    RouterLink,
    Feedback,
    Modal,
    Pagination,
    ReactiveFormsModule,
  ],
  styleUrl: './class-details.scss',
  templateUrl: './class-details.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDetails {
  readonly classes = inject(ClassesStore);
  private readonly confirm = inject(ConfirmDialogService);
  readonly lessonTypes = lessonTypes;
  readonly lessonFilterOptions: readonly FilterOption[] = [
    { value: '', label: 'Todos' },
    ...Object.entries(lessonTypes).map(([value, label]) => ({ value, label })),
  ];
  readonly studentAbsenceOptions: readonly FilterOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'with', label: 'Com faltas' },
    { value: 'without', label: 'Sem faltas' },
  ];
  private readonly attendance = inject(AttendanceStore);
  private readonly history = inject(HistoryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly lessonFilterForm = inject(FormBuilder).nonNullable.group({
    ...this.initialLessonFilters(),
  });
  readonly appliedLessonFilters = signal(this.lessonFilterForm.getRawValue());
  private readonly parentParams = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });
  readonly group = computed(() =>
    this.classes.get(
      this.parentParams().get('turma') ?? contextParam(this.route.snapshot, 'turma') ?? '',
    ),
  );
  readonly studentQuery = signal('');
  readonly studentAbsenceFilter = signal('all');
  readonly studentFilterChips = computed(() => {
    const query = this.studentQuery().trim();
    return [
      ...(query ? [{ key: 'student', label: 'Aluno', value: query }] : []),
      ...(this.studentAbsenceFilter() !== 'all'
        ? [{
            key: 'absences',
            label: 'Faltas',
            value: this.studentAbsenceFilter() === 'with' ? 'Com faltas' : 'Sem faltas',
          }]
        : []),
    ];
  });
  readonly students = computed(() => {
    const group = this.group();
    const query = this.studentQuery().trim().toLocaleLowerCase('pt-BR');
    const absenceFilter = this.studentAbsenceFilter();
    return group
      ? this.classes
          .roster(group.id)
          .filter((student) => {
            const matchesName = student.nome.toLocaleLowerCase('pt-BR').includes(query);
            const hasAbsences = this.absences(group.id, student.id) > 0;
            return (
              matchesName &&
              (absenceFilter === 'all' ||
                (absenceFilter === 'with' && hasAbsences) ||
                (absenceFilter === 'without' && !hasAbsences))
            );
          })
      : [];
  });
  readonly studentPaging = new TablePage(() => this.students().length);
  readonly visibleStudents = computed(() => this.studentPaging.slice(this.students()));
  setStudentQuery(value: string): void {
    this.studentQuery.set(value);
    this.studentPaging.page.set(1);
  }
  setStudentAbsenceFilter(value: string): void {
    this.studentAbsenceFilter.set(value);
    this.studentPaging.page.set(1);
  }
  clearStudentFilters(): void {
    this.setStudentQuery('');
    this.setStudentAbsenceFilter('all');
  }
  removeStudentFilter(key: string): void {
    if (key === 'student') this.setStudentQuery('');
    else if (key === 'absences') this.setStudentAbsenceFilter('all');
  }
  readonly section = this.route.snapshot.data['section'] as string;
  readonly lessons = computed(() =>
    this.history
      .records()
      .filter((item) => item.turmaId === this.group()?.id && item.tipo === 'aula'),
  );
  readonly filteredLessons = computed(() => {
    const filters = this.appliedLessonFilters();
    const query = filters.conteudo.trim().toLocaleLowerCase('pt-BR');
    return this.lessons().filter(
      (item) =>
        (!filters.tipo || (item.tipo === 'aula' && item.registro.tipo === filters.tipo)) &&
        (!filters.inicio || item.data >= filters.inicio) &&
        (!filters.fim || item.data <= filters.fim) &&
        (!query || `${item.titulo} ${item.resumo}`.toLocaleLowerCase('pt-BR').includes(query)),
    );
  });
  readonly lessonPaging = new TablePage(() => this.filteredLessons().length);
  readonly visibleLessons = computed(() => this.lessonPaging.slice(this.filteredLessons()));
  readonly lessonFilterChips = computed(() => {
    const filters = this.appliedLessonFilters();
    return [
      ...(filters.tipo
        ? [
            {
              key: 'tipo',
              label: 'Tipo',
              value:
                Object.entries(lessonTypes).find(([type]) => type === filters.tipo)?.[1] ??
                filters.tipo,
            },
          ]
        : []),
      ...(filters.inicio
        ? [{ key: 'inicio', label: 'Desde', value: formatDate(filters.inicio) }]
        : []),
      ...(filters.fim ? [{ key: 'fim', label: 'Até', value: formatDate(filters.fim) }] : []),
      ...(filters.conteudo
        ? [{ key: 'conteudo', label: 'Conteúdo', value: filters.conteudo }]
        : []),
    ];
  });
  readonly teachers = computed(() => {
    const group = this.group();
    const ids = group ? teachingAssignments(group).map(({ professorId }) => professorId) : [];
    return this.classes.teachers.filter((teacher) => ids.includes(teacher.id));
  });
  enrollmentDate(group: SchoolClass, id: string): string {
    const date = enrollments(group).find(({ alunoId }) => alunoId === id)?.dataMatricula;
    return date ? formatDate(date) : 'Não informada';
  }
  absences(classId: string, studentId: string): number {
    return Object.values(this.attendance.records()[classId] ?? {}).filter(
      (day) => day[studentId] === 'falta',
    ).length;
  }
  get currentUrl(): string {
    return navigationUrl(this.router);
  }
  private readonly weekdays = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  readonly dayLabel = (day: number): string => {
    const label = this.weekdays[day] ?? '';
    return label ? label[0].toLocaleUpperCase('pt-BR') + label.slice(1) : '';
  };
  readonly formatDate = formatDate;
  readonly message = signal('');
  readonly notice = signal('');
  readonly editingStudent = signal<Student | null>(null);
  readonly editMessage = signal('');
  readonly studentName = new FormControl('', {
    nonNullable: true,
    validators: requiredText(100),
  });
  constructor() {
    effect(() => {
      const filters = this.initialLessonFilters(this.queryParams());
      this.lessonFilterForm.setValue(filters, { emitEvent: false });
      this.appliedLessonFilters.set(filters);
    });
  }
  private initialLessonFilters(params = this.route.snapshot.queryParamMap) {
    const type = params.get('tipo') ?? '';
    return {
      tipo: Object.hasOwn(lessonTypes, type) ? type : '',
      inicio: this.validFilterDate(params.get('inicio')),
      fim: this.validFilterDate(params.get('fim')),
      conteudo: params.get('conteudo') ?? '',
    };
  }
  private validFilterDate(value: string | null): string {
    return value && isDate(value) ? value : '';
  }
  applyLessonFilters(): void {
    const filters = this.lessonFilterForm.getRawValue();
    if (filters.inicio && filters.fim && filters.inicio > filters.fim) {
      this.message.set('A data inicial deve ser anterior ou igual à data final.');
      return;
    }
    this.appliedLessonFilters.set(filters);
    this.lessonPaging.page.set(1);
    this.message.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tipo: filters.tipo || null,
        inicio: filters.inicio || null,
        fim: filters.fim || null,
        conteudo: filters.conteudo || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  clearLessonFilters(): void {
    this.lessonFilterForm.reset({ tipo: '', inicio: '', fim: '', conteudo: '' });
    this.applyLessonFilters();
  }
  removeLessonFilter(key: string): void {
    if (key === 'tipo') this.lessonFilterForm.controls.tipo.setValue('');
    else if (key === 'inicio') this.lessonFilterForm.controls.inicio.setValue('');
    else if (key === 'fim') this.lessonFilterForm.controls.fim.setValue('');
    else if (key === 'conteudo') this.lessonFilterForm.controls.conteudo.setValue('');
    this.applyLessonFilters();
  }
  editStudent(student: Student): void {
    this.studentName.reset(student.nome);
    this.editMessage.set('');
    this.editingStudent.set(student);
  }
  closeStudentEditor(): void {
    this.editingStudent.set(null);
    this.editMessage.set('');
  }
  async saveStudent(): Promise<void> {
    this.studentName.markAsTouched();
    if (this.studentName.invalid) {
      this.editMessage.set('Informe um nome com até 100 caracteres.');
      return;
    }
    const group = this.group();
    const student = this.editingStudent();
    if (!group || !student) return;
    try {
      await this.classes.renameStudent(group.id, student.id, this.studentName.value);
      this.message.set('');
      this.notice.set('Aluno atualizado.');
      this.closeStudentEditor();
    } catch (error) {
      this.editMessage.set(errorMessage(error));
    }
  }
  async removeStudent(classId: string, studentId: string): Promise<void> {
    const group = this.classes.get(classId);
    const student = this.classes.students.find((item) => item.id === studentId);
    if (
      !group ||
      !group.ativa ||
      !student ||
      group.alunoIds.length <= 1
    )
      return;
    if (!(await this.confirm.confirm(
      `Os registros históricos de ${student.nome} serão preservados.`,
      { title: `Excluir a matrícula de ${student.nome}?`, confirmLabel: 'Excluir', confirmIcon: 'person_remove' },
    ))) return;
    try {
      await this.classes.removeStudent(classId, studentId);
      this.message.set('');
      this.notice.set('Matrícula excluída.');
    } catch (error) {
      this.notice.set('');
      this.message.set(errorMessage(error));
    }
  }
  async toggleStatus(): Promise<void> {
    const group = this.group();
    if (!group) return;
    const confirmed = await this.confirm.confirm(
      group.ativa
        ? 'Os registros serão preservados e ficarão disponíveis somente para consulta.'
        : 'A turma ficará disponível novamente para uso.',
      {
        title: group.ativa ? 'Arquivar esta turma?' : 'Reativar esta turma?',
        confirmLabel: group.ativa ? 'Arquivar' : 'Reativar',
        confirmIcon: group.ativa ? 'archive' : 'unarchive',
      },
    );
    if (!confirmed) return;
    try {
      await this.classes.save({ ...group, ativa: !group.ativa });
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
}
