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
  Validators,
} from '@angular/forms';
import type { Student } from '../../core/models/domain';
import { lessonTypes } from '../../core/models/domain';
import { HistoryStore } from '../history/history.store';
import { ClassesStore } from './classes.store';
import { contextParam } from '../../core/navigation/context';
import { formatDate, isDate } from '../../shared/utils/dates';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { AttendanceStore } from '../attendance/attendance.store';
import { DataTable } from '../../shared/ui/data-table';
import { Modal } from '../../shared/ui/modal';
import { Pagination, TablePage } from '../../shared/ui/pagination';

@Component({
  selector: 'app-class-details',
  imports: [
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
  template: ` <main class="app-page surface content-scroll context-panel">
      @if (group(); as group) {
        @switch (section) {
          @case ('alunos') {
            <app-list-header
              title="Alunos matriculados"
              [count]="students().length"
              singular="aluno"
              plural="alunos"
            />
            <app-data-table label="Alunos matriculados na turma">
              <table class="students-table">
                <caption class="sr-only">
                  Alunos, situação de matrícula, faltas e ações disponíveis
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Status</th>
                    <th scope="col">Faltas</th>
                    <th scope="col" class="actions-cell">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (student of visibleStudents(); track student.id) {
                    <tr>
                      <th scope="row">
                        <span class="person-name"
                          ><app-person-avatar [name]="student.nome" />{{ student.nome }}</span
                        >
                      </th>
                      <td><app-badge tone="success">Matriculado</app-badge></td>
                      <td>{{ absences(group.id, student.id) }}</td>
                      <td class="actions-cell">
                        <div class="row-actions">
                          <a
                            appAction="open_in_new"
                            class="icon-button"
                            [routerLink]="['/turmas', group.id, 'frequencia']"
                            [queryParams]="{ retorno: currentUrl }"
                            title="Abrir frequência"
                            [attr.aria-label]="'Abrir frequência de ' + student.nome"
                          ></a>
                          @if (group.ativa) {
                            <button
                              appAction="edit"
                              class="icon-button"
                              type="button"
                              title="Editar aluno"
                              [attr.aria-label]="'Editar aluno ' + student.nome"
                              (click)="editStudent(student)"
                            ></button>
                            <button
                              appAction="delete"
                              class="icon-button danger"
                              type="button"
                              [title]="
                                group.alunoIds.length <= 1
                                  ? 'A turma deve ter pelo menos um aluno'
                                  : 'Excluir matrícula'
                              "
                              [attr.aria-label]="'Excluir matrícula de ' + student.nome"
                              [disabled]="group.alunoIds.length <= 1"
                              (click)="removeStudent(group.id, student.id)"
                            ></button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="app-empty">Nenhum aluno matriculado.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </app-data-table>
            <app-pagination
              [total]="students().length"
              [page]="studentPaging.current()"
              [size]="studentPaging.size()"
              (pageChange)="studentPaging.page.set($event)"
              (sizeChange)="studentPaging.resize($event)"
            />
          }
          @case ('aulas') {
            <app-filter-panel
              (applyFilters)="applyLessonFilters()"
              [chips]="lessonFilterChips()"
              [activeCount]="lessonFilterChips().length"
              [searchable]="true"
              (removeFilter)="removeLessonFilter($event)"
              (clearFilters)="clearLessonFilters()"
            >
              <form filter-search class="filter-search-form" (ngSubmit)="applyLessonFilters()">
                <label class="sr-only" for="lesson-search">Conteúdo da aula</label>
                <input
                  id="lesson-search"
                  name="conteudo"
                  type="search"
                  placeholder="Buscar no conteúdo das aulas"
                  [ngModel]="lessonFilterForm.controls.conteudo.value"
                  (ngModelChange)="lessonFilterForm.controls.conteudo.setValue($event)"
                />
                <button type="submit" title="Buscar" aria-label="Buscar">
                  <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </button>
              </form>
              <form
                class="filter-bar aulas-filters"
                [formGroup]="lessonFilterForm"
                (ngSubmit)="applyLessonFilters()"
              >
                <label
                  >Tipo de aula<select formControlName="tipo">
                    <option value="">Todos os tipos</option>
                    @for (type of lessonTypeOptions; track type[0]) {
                      <option [value]="type[0]">{{ type[1] }}</option>
                    }
                  </select></label
                >
                <label>Data inicial<input type="date" formControlName="inicio" /></label
                ><label>Data final<input type="date" formControlName="fim" /></label>
              </form>
            </app-filter-panel>
            <app-list-header
              title="Aulas registradas"
              [count]="filteredLessons().length"
              singular="aula"
              plural="aulas"
            />
            <app-data-table label="Aulas registradas na turma">
              <table class="lessons-table">
                <caption class="sr-only">
                  Data, tipo, conteúdo e ações das aulas registradas
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Conteúdo</th>
                    <th scope="col" class="actions-cell">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of visibleLessons(); track item.id) {
                    <tr>
                      <td>{{ formatDate(item.data) }}</td>
                      <td>
                        @if (item.tipo === 'aula') {
                          <span
                            class="table-badge lesson-type-badge"
                            [attr.data-lesson-type]="item.registro.tipo"
                            >{{ lessonTypes[item.registro.tipo] }}</span
                          >
                        }
                      </td>
                      <td>{{ item.resumo }}</td>
                      <td class="actions-cell">
                        <div class="row-actions">
                          <a
                            appAction="open_in_new"
                            class="icon-button"
                            title="Abrir registro"
                            [attr.aria-label]="'Abrir registro de ' + formatDate(item.data)"
                            [routerLink]="['/turmas', group.id, 'registros', item.id]"
                            [queryParams]="{ retorno: currentUrl }"
                          ></a>
                          @if (group.ativa) {
                            <a
                              appAction="edit"
                              class="icon-button"
                              title="Editar aula"
                              [attr.aria-label]="'Editar aula de ' + formatDate(item.data)"
                              [routerLink]="['/turmas', group.id, 'aulas', item.id, 'editar']"
                              [queryParams]="{ retorno: currentUrl }"
                            ></a>
                            <a
                              appAction="event_available"
                              class="icon-button"
                              title="Realizar chamada"
                              [attr.aria-label]="'Realizar chamada de ' + formatDate(item.data)"
                              [routerLink]="[
                                '/turmas',
                                group.id,
                                'registros',
                                item.id,
                                'frequencia',
                              ]"
                              [queryParams]="{ data: item.data, retorno: currentUrl }"
                            ></a>
                            <a
                              appAction="fact_check"
                              class="icon-button"
                              title="Avaliar alunos"
                              [attr.aria-label]="
                                'Avaliar alunos da aula de ' + formatDate(item.data)
                              "
                              [routerLink]="[
                                '/turmas',
                                group.id,
                                'registros',
                                item.id,
                                'avaliacoes',
                              ]"
                              [queryParams]="{ retorno: currentUrl }"
                            ></a>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="app-empty">Nenhuma aula registrada nesta turma.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </app-data-table>
            <app-pagination
              [total]="filteredLessons().length"
              [page]="lessonPaging.current()"
              [size]="lessonPaging.size()"
              (pageChange)="lessonPaging.page.set($event)"
              (sizeChange)="lessonPaging.resize($event)"
            />
          }
          @default {
            <section class="overview-grid" aria-label="Informações da turma">
              <article class="overview-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true"
                  >person</span
                >
                <h2>Professor responsável</h2>
                <p class="overview-card-value person-name">
                  <app-person-avatar [name]="teacher() ?? 'Professor'" />{{
                    teacher() ?? 'Não definido'
                  }}
                </p>
              </article>
              <article class="overview-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true"
                  >menu_book</span
                >
                <h2>Curso e módulo</h2>
                <p class="overview-card-value">{{ classes.course(group.cursoId)?.nome ?? '—' }}</p>
                <p class="overview-card-description">
                  {{ classes.module(group.cursoId, group.moduloId)?.nome ?? 'Módulo não definido' }}
                </p>
              </article>
              <article class="overview-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true"
                  >schedule</span
                >
                <h2>Horários</h2>
                <div class="overview-day-tags" aria-label="Dias da semana">
                  @for (day of group.dias; track day) {
                    <span>{{ dayLabel(day) }}</span>
                  }
                </div>
                <p class="overview-card-description overview-time">
                  {{ group.inicio }}–{{ group.fim }}
                </p>
              </article>
              <article class="overview-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true"
                  >groups</span
                >
                <h2>Alunos</h2>
                <p class="overview-card-value">{{ group.alunoIds.length }} matriculados</p>
              </article>
              <article class="overview-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true">{{
                  group.ativa ? 'check_circle' : 'archive'
                }}</span>
                <h2>Status da turma</h2>
                <p class="overview-card-value">
                  <app-badge [tone]="group.ativa ? 'success' : 'neutral'">{{
                    group.ativa ? 'Ativa' : 'Arquivada'
                  }}</app-badge>
                </p>
                <button
                  [appAction]="group.ativa ? 'archive' : 'unarchive'"
                  class="overview-text-action"
                  type="button"
                  (click)="toggleStatus()"
                >
                  {{ group.ativa ? 'Arquivar turma' : 'Reativar turma' }}
                </button>
              </article>
              <article class="overview-card overview-actions-card">
                <span class="overview-card-icon material-symbols-outlined" aria-hidden="true"
                  >apps</span
                >
                <h2>Ações rápidas</h2>
                <nav class="overview-quick-links" aria-label="Ações rápidas da turma">
                  <a
                    [routerLink]="['/turmas', group.id, 'alunos']"
                    [queryParams]="{ retorno: currentUrl }"
                    ><span class="material-symbols-outlined" aria-hidden="true">groups</span
                    >Alunos</a
                  >
                  <a
                    [routerLink]="['/turmas', group.id, 'aulas']"
                    [queryParams]="{ retorno: currentUrl }"
                    ><span class="material-symbols-outlined" aria-hidden="true">menu_book</span
                    >Aulas</a
                  >
                  <a
                    [routerLink]="['/turmas', group.id, 'frequencia']"
                    [queryParams]="{ retorno: currentUrl }"
                    ><span class="material-symbols-outlined" aria-hidden="true"
                      >event_available</span
                    >Frequência</a
                  >
                  <a
                    [routerLink]="['/turmas', group.id, 'avaliacoes']"
                    [queryParams]="{ retorno: currentUrl }"
                    ><span class="material-symbols-outlined" aria-hidden="true">fact_check</span
                    >Avaliações</a
                  >
                  <a
                    [routerLink]="['/turmas', group.id, 'gerenciar']"
                    [queryParams]="{ retorno: currentUrl }"
                    ><span class="material-symbols-outlined" aria-hidden="true">edit</span>Editar
                    turma</a
                  >
                </nav>
              </article>
            </section>
          }
        }
        @if (message()) {
          <app-feedback [message]="message()" [error]="true" />
        }
        @if (notice()) {
          <app-feedback [message]="notice()" />
        }
      }
    </main>
    <app-modal
      title="Editar aluno"
      [open]="!!editingStudent()"
      [compact]="true"
      (closed)="closeStudentEditor()"
    >
      <form class="student-editor" (submit)="$event.preventDefault(); saveStudent()">
        <label class="field" for="student-name">Nome do aluno</label>
        <input
          id="student-name"
          type="text"
          autocomplete="name"
          required
          maxlength="100"
          [formControl]="studentName"
          [attr.aria-invalid]="studentName.touched && studentName.invalid"
          [attr.aria-describedby]="editMessage() ? 'student-edit-message' : null"
        />
        <app-feedback id="student-edit-message" [message]="editMessage()" [error]="true" />
        <div class="app-actions end">
          <button appAction="close" class="app-button" type="button" (click)="closeStudentEditor()">
            Cancelar
          </button>
          <button appAction="save" class="app-button primary" type="submit">
            Salvar alterações
          </button>
        </div>
      </form>
    </app-modal>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDetails {
  readonly classes = inject(ClassesStore);
  readonly lessonTypes = lessonTypes;
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
  readonly lessonTypeOptions = Object.entries(lessonTypes);
  private readonly parentParams = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });
  readonly group = computed(() =>
    this.classes.get(
      this.parentParams().get('turma') ?? contextParam(this.route.snapshot, 'turma') ?? '',
    ),
  );
  readonly students = computed(() => {
    const group = this.group();
    return group ? this.classes.roster(group.id) : [];
  });
  readonly studentPaging = new TablePage(() => this.students().length);
  readonly visibleStudents = computed(() => this.studentPaging.slice(this.students()));
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
  readonly teacher = computed(
    () => this.classes.teachers.find((item) => item.id === this.group()?.professorId)?.nome,
  );
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
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
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
  saveStudent(): void {
    this.studentName.markAsTouched();
    if (this.studentName.invalid) {
      this.editMessage.set('Informe um nome com até 100 caracteres.');
      return;
    }
    const group = this.group();
    const student = this.editingStudent();
    if (!group || !student) return;
    try {
      this.classes.renameStudent(group.id, student.id, this.studentName.value);
      this.message.set('');
      this.notice.set('Aluno atualizado.');
      this.closeStudentEditor();
    } catch (error) {
      this.editMessage.set(errorMessage(error));
    }
  }
  removeStudent(classId: string, studentId: string): void {
    const group = this.classes.get(classId);
    const student = this.classes.students.find((item) => item.id === studentId);
    if (
      !group ||
      !group.ativa ||
      !student ||
      group.alunoIds.length <= 1 ||
      !window.confirm(
        `Excluir a matrícula de ${student.nome} desta turma? Os registros históricos serão preservados.`,
      )
    )
      return;
    try {
      this.classes.removeStudent(classId, studentId);
      this.message.set('');
      this.notice.set('Matrícula excluída.');
    } catch (error) {
      this.notice.set('');
      this.message.set(errorMessage(error));
    }
  }
  toggleStatus(): void {
    const group = this.group();
    if (
      !group ||
      !window.confirm(
        group.ativa
          ? 'Arquivar esta turma? Os registros serão preservados e ficarão disponíveis somente para consulta.'
          : 'Reativar esta turma?',
      )
    )
      return;
    try {
      this.classes.save({ ...group, ativa: !group.ativa });
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
}
