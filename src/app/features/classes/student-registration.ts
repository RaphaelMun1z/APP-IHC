import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { contextParam, returnTo } from '../../core/navigation/context';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { ClassesStore } from './classes.store';
import { studentFields } from '../../core/models/domain';
import type { StudentDetails } from '../../core/models/domain';
import { localDate } from '../../shared/utils/dates';
import { RequestState } from '../../core/api/request-state';

@Component({
  selector: 'app-student-registration',
  imports: [Action, Feedback, ReactiveFormsModule, RouterLink],
  template: `
    <main class="app-page registro-page">
      <section
        class="surface content-scroll registro-panel"
        aria-label="Formulário de cadastro de aluno"
      >
        @if (!group()) {
          <p class="app-empty" role="alert">Turma não encontrada.</p>
        } @else if (studentId && !student) {
          <p class="app-empty" role="alert">Aluno não matriculado nesta turma.</p>
        } @else if (!group()?.ativa) {
          <p class="app-empty" role="status">
            Esta turma está arquivada e não permite novas matrículas.
            <a [routerLink]="backLink">Voltar à turma</a>
          </p>
        } @else {
          <form class="registro-form form-wizard" [formGroup]="form" (ngSubmit)="save()">
            <header class="form-wizard-header">
              <a appAction="close" class="form-wizard-cancel" [routerLink]="backLink">
                Cancelar
              </a>
            </header>
            <div class="form-wizard-layout">
              <nav class="form-wizard-sidebar" aria-label="Etapas do formulário">
                <ol>
                  <li>
                    <button type="button" aria-current="step">
                      <span class="form-wizard-step-number">1</span>
                      <span class="form-wizard-step-copy">
                        <strong>Dados do aluno</strong>
                        <small>Identificação, contato e endereço</small>
                      </span>
                    </button>
                  </li>
                </ol>
              </nav>
              <div class="form-wizard-content">
                <section class="form-wizard-panel">
                  <h2>{{ studentId ? 'Editar dados do aluno' : 'Cadastrar aluno' }}</h2>
                  @if (!studentId) { <p>O aluno será matriculado na turma {{ group()?.nome }}.</p> }
                  <div class="form-wizard-field-stack">
                    <label class="registro-field" for="new-student-name">
                      Nome do aluno
                      <input
                        id="new-student-name"
                        type="text"
                        autocomplete="name"
                        required
                        maxlength="100"
                        formControlName="name"
                        [attr.aria-invalid]="name.touched && name.invalid"
                        [attr.aria-describedby]="message() ? 'student-registration-message' : null"
                      />
                    </label>
                    <div formGroupName="details" class="form-wizard-field-stack">
                      @for (field of fields; track field.key) {
                        <label class="registro-field">
                          {{ field.label }}
                          <input
                            [formControlName]="field.key"
                            [type]="field.key === 'dataNascimento' ? 'date' : field.key === 'email' ? 'email' : field.key === 'telefone' ? 'tel' : 'text'"
                            [attr.max]="field.key === 'dataNascimento' ? today : null"
                            [attr.maxlength]="field.key === 'uf' ? 2 : 150"
                          />
                        </label>
                      }
                    </div>
                  </div>
                </section>
                <app-feedback
                  id="student-registration-message"
                  [message]="message()"
                  [error]="isError()"
                />
                <nav class="form-wizard-actions" aria-label="Ações do formulário">
                  <button appAction="save" class="primary" type="submit" [disabled]="form.invalid || requests.saving()">Salvar aluno</button>
                  <a class="form-wizard-back" [routerLink]="backLink">Voltar à turma</a>
                </nav>
              </div>
            </div>
          </form>
        }
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentRegistration implements UnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly classes = inject(ClassesStore);
  readonly requests = inject(RequestState);
  readonly classId = contextParam(this.route.snapshot, 'turma') ?? '';
  readonly group = computed(() => this.classes.get(this.classId));
  readonly studentId = contextParam(this.route.snapshot, 'aluno');
  readonly student = this.classes.roster(this.classId).find(({ id }) => id === this.studentId);
  readonly today = localDate();
  readonly fields = (Object.keys(studentFields) as (keyof StudentDetails)[]).map((key) => ({ key, label: studentFields[key] }));
  readonly back = returnTo(this.route.snapshot, `/turmas/${this.classId}/alunos`);
  readonly backLink = this.router.parseUrl(this.back);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly name = new FormControl(this.student?.nome ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  readonly form = new FormGroup({
    name: this.name,
    details: new FormGroup(Object.fromEntries(this.fields.map(({ key }) => [
      key, new FormControl(this.student?.[key] ?? '', {
        nonNullable: true,
        validators: key === 'email' ? [Validators.email] : [Validators.maxLength(key === 'uf' ? 2 : 150)],
      }),
    ]))),
  });

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.isError.set(true);
      this.message.set('Confira o nome e os dados informados.');
      return;
    }

    const group = this.group();
    if (!group?.ativa) {
      this.isError.set(true);
      this.message.set('Esta turma está arquivada e não permite novas matrículas.');
      return;
    }

    try {
      const input = { ...this.form.controls.details.getRawValue(), nome: this.name.value };
      if (this.studentId) await this.classes.updateStudent(group.id, this.studentId, input);
      else await this.classes.addStudent(group.id, input);
      this.form.markAsPristine();
      void this.router.navigateByUrl(this.backLink);
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
