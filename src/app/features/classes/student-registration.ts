import { FieldError } from '../../shared/ui/field-error';
import { requiredText } from '../../shared/utils/form-validators';
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
  imports: [FieldError, Action, Feedback, ReactiveFormsModule, RouterLink],
  templateUrl: './student-registration.html',
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
    validators: requiredText(100),
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
