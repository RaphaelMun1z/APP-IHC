import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { contextParam, returnTo } from '../../core/navigation/context';
import { UnsavedChangesDirective } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { ClassesStore } from './classes.store';

@Component({
  selector: 'app-student-registration',
  imports: [Action, Feedback, ReactiveFormsModule, RouterLink, UnsavedChangesDirective],
  template: `
    <main class="app-page registro-page" [appUnsavedChanges]="hasUnsavedChanges()">
      <section
        class="surface content-scroll registro-panel"
        aria-label="Formulário de cadastro de aluno"
      >
        @if (!group()) {
          <p class="app-empty" role="alert">Turma não encontrada.</p>
        } @else if (!group()?.ativa) {
          <p class="app-empty" role="status">
            Esta turma está arquivada e não permite novas matrículas.
            <a [routerLink]="backLink">Voltar à turma</a>
          </p>
        } @else {
          <form class="registro-form form-wizard" [formGroup]="form" (ngSubmit)="save()">
            <header class="form-wizard-header">
              <a appAction="arrow_back" class="form-wizard-cancel" [routerLink]="backLink">
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
                        <small>Nome e matrícula</small>
                      </span>
                    </button>
                  </li>
                </ol>
              </nav>
              <div class="form-wizard-content">
                <section class="form-wizard-panel">
                  <h2>Cadastrar aluno</h2>
                  <p>Adicione um aluno à turma {{ group()?.nome }}.</p>
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
                  </div>
                </section>
                <app-feedback
                  id="student-registration-message"
                  [message]="message()"
                  [error]="isError()"
                />
                <nav class="form-wizard-actions" aria-label="Ações do formulário">
                  <button appAction="save" class="primary" type="submit">Salvar aluno</button>
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
  readonly classId = contextParam(this.route.snapshot, 'turma') ?? '';
  readonly group = computed(() => this.classes.get(this.classId));
  readonly back = returnTo(this.route.snapshot, `/turmas/${this.classId}/alunos`);
  readonly backLink = this.router.parseUrl(this.back);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  readonly form = new FormGroup({ name: this.name });

  hasUnsavedChanges(): boolean {
    return this.name.dirty && this.name.value.trim().length > 0;
  }

  save(): void {
    this.name.markAsTouched();
    if (this.name.invalid) {
      this.isError.set(true);
      this.message.set('Informe um nome com até 100 caracteres.');
      return;
    }

    const group = this.group();
    if (!group?.ativa) {
      this.isError.set(true);
      this.message.set('Esta turma está arquivada e não permite novas matrículas.');
      return;
    }

    try {
      this.classes.addStudent(group.id, this.name.value);
      this.name.markAsPristine();
      void this.router.navigateByUrl(this.backLink);
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
