import { Action } from '../../shared/ui/action';
import { contextParam, returnTo } from '../../core/navigation/context';
import { AuthService } from '../../core/auth/auth.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClassesStore } from '../classes/classes.store';
import { UnsavedChangesDirective } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { weekdays } from '../../shared/utils/dates';
@Component({
  selector: 'app-class-editor',
  imports: [Action, ReactiveFormsModule, RouterLink, Feedback, UnsavedChangesDirective],
  templateUrl: './class-editor.html',
  styleUrl: './class-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassEditor implements UnsavedChanges {
  readonly classes = inject(ClassesStore);
  private readonly router = inject(Router);
  private readonly classId = contextParam(inject(ActivatedRoute).snapshot, 'turma');
  readonly back = returnTo(
    inject(ActivatedRoute).snapshot,
    this.classId ? `/turmas/${this.classId}/visao-geral` : '/coordenacao',
    inject(AuthService).isCoordinator(),
  );
  readonly existing = this.classId ? this.classes.get(this.classId) : undefined;
  readonly unavailable = !!this.classId && !this.existing;
  readonly form = inject(FormBuilder).nonNullable.group({
    nome: [this.existing?.nome ?? '', [Validators.required, Validators.maxLength(60)]],
    professorId: [this.existing?.professorId ?? '', Validators.required],
    cursoId: [this.existing?.cursoId ?? '', Validators.required],
    moduloId: [this.existing?.moduloId ?? '', Validators.required],
    inicio: [this.existing?.inicio ?? '08:00', Validators.required],
    fim: [this.existing?.fim ?? '08:50', Validators.required],
    ativa: this.existing?.ativa ?? true,
  });
  readonly days = signal<readonly number[]>(this.existing?.dias ?? []);
  readonly students = signal<readonly string[]>(this.existing?.alunoIds ?? []);
  private readonly selectionDirty = signal(false);
  readonly weekdays = weekdays;
  readonly message = signal('');
  modules() {
    return this.classes.course(this.form.controls.cursoId.value)?.modulos ?? [];
  }
  hasUnsavedChanges(): boolean {
    return this.form.dirty || this.selectionDirty();
  }
  selectCourse(): void {
    this.form.controls.moduloId.setValue('');
  }
  toggleDay(day: number): void {
    this.days.update((values) => toggleValue(values, day));
    this.selectionDirty.set(true);
  }
  toggleStudent(id: string): void {
    this.students.update((values) => toggleValue(values, id));
    this.selectionDirty.set(true);
  }
  toggleAll(): void {
    this.students.set(
      this.students().length === this.classes.students.length
        ? []
        : this.classes.students.map((student) => student.id),
    );
    this.selectionDirty.set(true);
  }
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Preencha os dados obrigatórios da turma.');
      return;
    }
    try {
      if (
        this.existing?.ativa &&
        !this.form.controls.ativa.value &&
        !window.confirm('Arquivar esta turma? Os registros serão preservados.')
      )
        return;
      const saved = this.classes.save({
        ...this.form.getRawValue(),
        id: this.existing?.id ?? '',
        dias: this.days(),
        alunoIds: this.students(),
      });
      this.form.markAsPristine();
      this.selectionDirty.set(false);
      void this.router.navigateByUrl(
        this.existing ? this.back : `/turmas/${saved.id}/visao-geral?retorno=%2Fcoordenacao`,
      );
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = inject(Router).parseUrl(this.back);
}
