import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { Modal } from '../../shared/ui/modal';
import { errorMessage } from '../../shared/utils/errors';
import { ClassesStore } from './classes.store';

@Component({
  selector: 'app-student-registration',
  imports: [Action, Feedback, Modal, ReactiveFormsModule],
  styleUrl: './class-details.scss',
  template: `
    <button
      appAction="person_add"
      class="app-button primary"
      type="button"
      (click)="openRegistration()"
    >
      Cadastrar aluno
    </button>
    @if (notice()) {
      <span class="sr-only" role="status">{{ notice() }}</span>
    }
    <app-modal
      title="Cadastrar aluno"
      [open]="open()"
      [compact]="true"
      (closed)="closeRegistration()"
    >
      <form class="student-editor" (submit)="$event.preventDefault(); save()">
        <label class="field" for="new-student-name">Nome do aluno</label>
        <input
          id="new-student-name"
          type="text"
          autocomplete="name"
          required
          maxlength="100"
          [formControl]="name"
          [attr.aria-invalid]="name.touched && name.invalid"
          [attr.aria-describedby]="message() ? 'student-registration-message' : null"
        />
        <app-feedback id="student-registration-message" [message]="message()" [error]="true" />
        <div class="app-actions end">
          <button appAction="close" class="app-button" type="button" (click)="closeRegistration()">
            Cancelar
          </button>
          <button appAction="save" class="app-button primary" type="submit">Salvar aluno</button>
        </div>
      </form>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentRegistration {
  readonly classId = input.required<string>();
  private readonly classes = inject(ClassesStore);
  readonly open = signal(false);
  readonly message = signal('');
  readonly notice = signal('');
  readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  openRegistration(): void {
    this.name.reset('');
    this.message.set('');
    this.notice.set('');
    this.open.set(true);
  }
  closeRegistration(): void {
    this.open.set(false);
    this.message.set('');
  }
  save(): void {
    this.name.markAsTouched();
    if (this.name.invalid) {
      this.message.set('Informe um nome com até 100 caracteres.');
      return;
    }
    try {
      this.classes.addStudent(this.classId(), this.name.value);
      this.notice.set('Aluno cadastrado na turma.');
      this.closeRegistration();
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
}
