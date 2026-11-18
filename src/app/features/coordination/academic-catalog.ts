import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { CatalogApi } from '../../core/api/catalog.api';
import type { CatalogRegistration } from '../../core/api/contracts';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import { teachingAssignments } from '../../core/data/academic-records';
import { ListHeader } from '../../shared/ui/list-header';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';
import type { CourseModule } from '../../core/models/domain';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { ClassesStore } from '../classes/classes.store';

@Component({
  selector: 'app-academic-catalog',
  imports: [Action, Feedback, FormsModule, RouterLink, RouterLinkActive, ListHeader],
  templateUrl: './academic-catalog.html',
  styleUrl: './academic-catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicCatalog {
  readonly tabs = [
    { path: '/coordenacao', label: 'Catálogo' },
    { path: '/coordenacao/cadastros', label: 'Cadastros' },
    { path: '/coordenacao/vinculos', label: 'Vínculos' },
  ];
  readonly view = inject(ActivatedRoute).snapshot.data['view'] as string;
  private readonly form = viewChild(NgForm);
  private readonly dialog = inject(ConfirmDialogService);
  readonly query = signal('');
  private matches(value: string): boolean {
    return value
      .toLocaleLowerCase('pt-BR')
      .includes(this.query().trim().toLocaleLowerCase('pt-BR'));
  }
  lessons(module: CourseModule) {
    const curriculum = module.curriculo ?? [];
    const legacy = module.licoes.flatMap((titulo, index) =>
      curriculum.some((lesson) => lesson.titulo === titulo) ? [] : [{ titulo, numero: index + 1 }],
    );
    return [...curriculum, ...legacy].sort((a, b) => a.numero - b.numero);
  }
  readonly courses = computed(() =>
    this.catalog().cursos.filter(
      (course) =>
        this.matches(course.nome) ||
        course.modulos.some(
          (module) =>
            this.matches(module.nome) ||
            this.lessons(module).some((lesson) => this.matches(lesson.titulo)),
        ),
    ),
  );
  readonly people = computed(() =>
    [
      ...this.catalog().professores.map((person) => ({ ...person, role: 'Professor' })),
      ...(this.catalog().coordenadores ?? []).map((person) => ({
        ...person,
        role: 'Coordenação',
        telefone: '',
      })),
    ].filter((person) => this.matches(person.nome) || this.matches(person.email ?? '')),
  );
  readonly assignmentDirty = computed(() => {
    const group = this.group();
    if (!group) return false;
    const ids = teachingAssignments(group).map((row) => row.professorId);
    return ids.length !== this.selected().length || ids.some((id) => !this.selected().includes(id));
  });
  hasUnsavedChanges(): boolean {
    return !!this.form()?.dirty || this.assignmentDirty();
  }
  async changeClass(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const id = select.value;
    if (this.assignmentDirty()) {
      select.value = this.classId();
      if (
        !(await this.dialog.confirm('Descartar as alterações nos vínculos?', {
          confirmLabel: 'Descartar',
        }))
      )
        return;
    }
    select.value = id;
    this.selectClass(id);
  }
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

  async register(form: NgForm): Promise<void> {
    if (form.invalid || this.requests.saving()) return;
    const nome = this.name.trim();
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
      case 'professor':
        input = { tipo, nome, cpf: this.cpf, email: this.email, telefone: this.phone };
        break;
      case 'coordenador':
        input = { tipo, nome, cpf: this.cpf, email: this.email };
    }
    try {
      this.state.catalog.set(await this.requests.mutate(this.api.register(input)));
      form.resetForm({ tipo, cursoId, moduloId: this.moduleId });
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
    this.assignmentMessage.set('');
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
