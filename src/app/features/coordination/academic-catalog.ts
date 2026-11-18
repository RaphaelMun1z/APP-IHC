import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogApi } from '../../core/api/catalog.api';
import type { CatalogRegistration } from '../../core/api/contracts';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import { teachingAssignments } from '../../core/data/academic-records';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { ClassesStore } from '../classes/classes.store';

@Component({
  selector: 'app-academic-catalog',
  imports: [Action, Feedback, FormsModule, RouterLink],
  template: `
    <main class="app-page">
      <div class="surface content-scroll academic-content">
        <section class="form-wizard-panel">
          <h2>Cadastros pedagógicos</h2>
          <form class="form-wizard-field-stack" #cadastro="ngForm" (ngSubmit)="register()">
            <label class="field"
              >Tipo de cadastro
              <select name="tipo" [(ngModel)]="kind">
                <option value="curso">Curso</option>
                <option value="modulo">Módulo</option>
                <option value="licao">Lição</option>
                <option value="professor">Professor</option>
                <option value="coordenador">Coordenação pedagógica</option>
              </select>
            </label>
            @if (kind === 'modulo' || kind === 'licao') {
              <label class="field"
                >Curso
                <select
                  name="cursoId"
                  [(ngModel)]="courseId"
                  (ngModelChange)="moduleId = ''"
                  required
                >
                  <option value="">Selecione</option>
                  @for (course of catalog().cursos; track course.id) {
                    <option [value]="course.id">{{ course.nome }}</option>
                  }
                </select>
              </label>
            }
            @if (kind === 'licao') {
              <label class="field"
                >Módulo
                <select name="moduloId" [(ngModel)]="moduleId" required>
                  <option value="">Selecione</option>
                  @for (module of classes.course(courseId)?.modulos ?? []; track module.id) {
                    <option [value]="module.id">{{ module.nome }}</option>
                  }
                </select>
              </label>
            }
            <label class="field"
              >{{ kind === 'licao' ? 'Título' : 'Nome' }}
              <input name="nome" [(ngModel)]="name" required maxlength="150" />
            </label>
            @if (kind === 'modulo' || kind === 'licao') {
              <label class="field"
                >Número
                <input name="numero" type="number" min="1" step="1" [(ngModel)]="number" required />
              </label>
            }
            @if (kind === 'curso') {
              <label class="field"
                >Área<input name="area" [(ngModel)]="area" required maxlength="150"
              /></label>
              <label class="field"
                >Carga horária total
                <input
                  name="cargaHoraria"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="hours"
                  required
                />
              </label>
            }
            @if (kind === 'professor' || kind === 'coordenador') {
              <label class="field"
                >CPF<input name="cpf" [(ngModel)]="cpf" required maxlength="14"
              /></label>
              <label class="field"
                >E-mail<input
                  name="email"
                  type="email"
                  [(ngModel)]="email"
                  email
                  required
                  maxlength="150"
              /></label>
            }
            @if (kind === 'professor') {
              <label class="field"
                >Telefone<input
                  name="telefone"
                  type="tel"
                  [(ngModel)]="phone"
                  required
                  maxlength="150"
              /></label>
            }
            <div>
              <button
                appAction="save"
                class="primary"
                type="submit"
                [disabled]="cadastro.invalid || requests.saving()"
              >
                Cadastrar
              </button>
            </div>
            <app-feedback [message]="catalogMessage()" [error]="catalogError()" />
          </form>
        </section>
        <section class="form-wizard-panel">
          <h2>Professores por turma</h2>
          <label class="field"
            >Turma
            <select [ngModel]="classId()" (ngModelChange)="selectClass($event)">
              <option value="">Selecione</option>
              @for (group of classes.accessible(); track group.id) {
                <option [value]="group.id">{{ group.nome }}</option>
              }
            </select>
          </label>
          @if (group()) {
            <fieldset class="form-wizard-choice">
              <legend>Professores vinculados</legend>
              <div class="form-wizard-option-list">
                @for (teacher of catalog().professores; track teacher.id) {
                  <label class="form-wizard-option">
                    <input
                      type="checkbox"
                      [checked]="selected().includes(teacher.id)"
                      (change)="toggle(teacher.id)"
                    />
                    <span>{{ teacher.nome }}</span>
                  </label>
                }
              </div>
            </fieldset>
            <button
              appAction="save"
              class="primary"
              type="button"
              (click)="saveTeachers()"
              [disabled]="!selected().length || requests.saving()"
            >
              Salvar vínculos
            </button>
          }
          <app-feedback [message]="assignmentMessage()" [error]="assignmentError()" />
          <a appAction="add" class="app-button" routerLink="/turma-form">Nova turma</a>
        </section>
        <section class="form-wizard-panel">
          <h2>Cursos, módulos e lições</h2>
          @for (course of catalog().cursos; track course.id) {
            <details>
              <summary>
                {{ course.nome }} · {{ course.area }} · {{ course.cargaHorariaTotal }} h
              </summary>
              @for (module of course.modulos; track module.id) {
                <h3>{{ module.numero }}. {{ module.nome }}</h3>
                <ul>
                  @for (lesson of module.curriculo ?? []; track lesson.id) {
                    <li>{{ lesson.numero }}. {{ lesson.titulo }}</li>
                  }
                </ul>
              }
            </details>
          }
        </section>
        <section class="form-wizard-panel">
          <h2>Equipe pedagógica</h2>
          <details>
            <summary>Coordenação</summary>
            <ul>
              @for (coordinator of catalog().coordenadores ?? []; track coordinator.id) {
                <li>{{ coordinator.nome }} · {{ coordinator.email }}</li>
              }
            </ul>
          </details>
          <details>
            <summary>Professores</summary>
            <ul>
              @for (teacher of catalog().professores; track teacher.id) {
                <li>{{ teacher.nome }}{{ teacher.email ? ' · ' + teacher.email : '' }}</li>
              }
            </ul>
          </details>
        </section>
      </div>
    </main>
  `,
  styles: `
    .academic-content {
      padding: var(--content-pad, 1.5rem);
      display: grid;
      gap: 1.5rem;
      align-content: start;
    }
    section {
      max-width: 46rem;
    }
    section > :is(button, a, details) {
      margin-block-start: 0.75rem;
    }
    summary {
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicCatalog {
  private readonly state = inject(DataState);
  private readonly api = inject(CatalogApi);
  readonly requests = inject(RequestState);
  readonly classes = inject(ClassesStore);
  readonly catalog = this.state.catalog;
  readonly classId = signal('');
  readonly group = computed(() => this.classes.get(this.classId()));
  readonly selected = signal<readonly string[]>([]);
  readonly catalogMessage = signal('');
  readonly catalogError = signal(false);
  readonly assignmentMessage = signal('');
  readonly assignmentError = signal(false);
  kind: CatalogRegistration['tipo'] = 'curso';
  courseId = '';
  moduleId = '';
  name = '';
  area = '';
  cpf = '';
  email = '';
  phone = '';
  number: number | null = null;
  hours: number | null = null;

  async register(): Promise<void> {
    const nome = this.name;
    const cursoId = this.courseId;
    const numero = this.number ?? 0;
    const tipo = this.kind;
    let input: CatalogRegistration;
    switch (tipo) {
      case 'curso':
        input = { tipo, nome, area: this.area, cargaHorariaTotal: this.hours ?? 0 };
        break;
      case 'modulo':
        input = { tipo, nome, cursoId, numero };
        break;
      case 'licao':
        input = { tipo, cursoId, moduloId: this.moduleId, titulo: nome, numero };
        break;
      default:
        input = { tipo, nome, cpf: this.cpf, email: this.email, telefone: this.phone };
    }
    try {
      this.state.catalog.set(await this.requests.mutate(this.api.register(input)));
      this.name = this.cpf = this.email = this.phone = '';
      this.catalogError.set(false);
      this.catalogMessage.set('Cadastro salvo.');
    } catch (error: unknown) {
      this.catalogError.set(true);
      this.catalogMessage.set(errorMessage(error));
    }
  }

  selectClass(id: string): void {
    this.classId.set(id);
    const group = this.group();
    this.selected.set(
      group ? teachingAssignments(group).map(({ professorId }) => professorId) : [],
    );
    this.assignmentMessage.set('');
  }

  toggle(id: string): void {
    this.selected.update((ids) => toggleValue(ids, id));
  }

  async saveTeachers(): Promise<void> {
    try {
      await this.classes.assignTeachers(this.classId(), this.selected());
      this.assignmentError.set(false);
      this.assignmentMessage.set('Vínculos salvos.');
    } catch (error: unknown) {
      this.assignmentError.set(true);
      this.assignmentMessage.set(errorMessage(error));
    }
  }
}
