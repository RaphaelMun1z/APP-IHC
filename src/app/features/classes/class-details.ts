import { Action } from '../../shared/ui/action';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { Badge } from '../../shared/ui/badge';
import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import type { Student } from '../../core/models/domain';
import { HistoryStore } from '../history/history.store';
import { ClassesStore } from './classes.store';
import { contextParam } from '../../core/navigation/context';
import { formatDate } from '../../shared/utils/dates';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { AttendanceStore } from '../attendance/attendance.store';
import { DataTable } from '../../shared/ui/data-table';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-class-details',
  imports: [
    Action,
    Badge,
    DataTable,
    ListHeader,
    PersonAvatar,
    RouterLink,
    Feedback,
    Modal,
    ReactiveFormsModule,
  ],
  styleUrl: './class-details.scss',
  template: ` <main class="app-page surface content-scroll context-panel">
      @if (group(); as group) {
        @switch (section) {
          @case ('alunos') {
            <app-list-header
              title="Alunos matriculados"
              [count]="group.alunoIds.length"
              singular="aluno"
              plural="alunos"
            />
            @if (auth.isCoordinator()) {
              <a
                appAction="manage_accounts"
                class="app-button"
                [routerLink]="['/turmas', group.id, 'gerenciar']"
                [queryParams]="{ retorno: currentUrl }"
                >Gerenciar matrículas</a
              >
            }
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
                  @for (student of classes.roster(group.id); track student.id) {
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
          }
          @case ('aulas') {
            <app-list-header
              title="Aulas registradas"
              [count]="lessons().length"
              singular="aula"
              plural="aulas"
            />
            @if (group.ativa) {
              <a
                appAction="add"
                class="app-button primary"
                [routerLink]="['/turmas', group.id, 'aulas', 'nova']"
                [queryParams]="{ retorno: currentUrl }"
                >Registrar aula</a
              >
            }
            <ul class="context-list">
              @for (item of lessons(); track item.id) {
                <li>
                  <div>
                    <strong>{{ formatDate(item.data) }}</strong>
                    <p>{{ item.resumo }}</p>
                  </div>
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
                    }
                  </div>
                </li>
              } @empty {
                <li>Nenhuma aula registrada nesta turma.</li>
              }
            </ul>
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
                @if (auth.isCoordinator()) {
                  <button
                    [appAction]="group.ativa ? 'archive' : 'unarchive'"
                    class="overview-text-action"
                    type="button"
                    (click)="toggleStatus()"
                  >
                    {{ group.ativa ? 'Arquivar turma' : 'Reativar turma' }}
                  </button>
                }
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
                  @if (auth.isCoordinator()) {
                    <a
                      [routerLink]="['/turmas', group.id, 'gerenciar']"
                      [queryParams]="{ retorno: currentUrl }"
                      ><span class="material-symbols-outlined" aria-hidden="true">edit</span>Editar
                      turma</a
                    >
                  }
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
  readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceStore);
  private readonly history = inject(HistoryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parentParams = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });
  readonly group = computed(() =>
    this.classes.get(
      this.parentParams().get('turma') ?? contextParam(this.route.snapshot, 'turma') ?? '',
    ),
  );
  readonly section = this.route.snapshot.data['section'] as string;
  readonly lessons = computed(() =>
    this.history
      .records()
      .filter((item) => item.turmaId === this.group()?.id && item.tipo === 'aula'),
  );
  readonly teacher = computed(
    () => this.classes.teachers.find((item) => item.id === this.group()?.professorId)?.nome,
  );
  absences(classId: string, studentId: string): number {
    return Object.values(this.attendance.records()[classId] ?? {}).filter(
      (day) => day[studentId] === 'falta',
    ).length;
  }
  readonly currentUrl = navigationUrl(this.router);
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
