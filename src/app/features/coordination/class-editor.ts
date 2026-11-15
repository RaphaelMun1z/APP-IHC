import { Action } from '../../shared/ui/action';
import { contextParam, returnTo } from '../../core/navigation/context';
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
    this.classId ? `/turmas/${this.classId}/visao-geral` : '/turmas',
  );
  readonly existing = this.classId ? this.classes.get(this.classId) : undefined;
  readonly unavailable = !!this.classId && !this.existing;
  readonly steps = [
    { title: 'Dados da turma', description: 'Identificação, professor e conteúdo' },
    { title: 'Horários', description: 'Dias e horário dos encontros' },
    { title: 'Alunos', description: 'Matrículas e situação da turma' },
  ];
  readonly step = signal(0);
  readonly furthestStep = signal(0);
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
  goToStep(index: number): void {
    if (index >= 0 && index <= this.furthestStep()) {
      this.step.set(index);
      this.message.set('');
    }
  }
  next(): void {
    if (this.step() === 0) {
      const controls = [
        this.form.controls.nome,
        this.form.controls.professorId,
        this.form.controls.cursoId,
        this.form.controls.moduloId,
      ];
      controls.forEach((control) => control.markAsTouched());
      if (controls.some((control) => control.invalid)) {
        this.message.set('Preencha os dados obrigatórios da turma antes de continuar.');
        return;
      }
    }
    if (this.step() === 1) {
      const { inicio, fim } = this.form.getRawValue();
      this.form.controls.inicio.markAsTouched();
      this.form.controls.fim.markAsTouched();
      if (!this.days().length || !inicio || !fim || fim <= inicio) {
        this.message.set('Selecione pelo menos um dia e um horário final posterior ao inicial.');
        return;
      }
    }
    this.message.set('');
    this.step.update((current) => Math.min(this.steps.length - 1, current + 1));
    this.furthestStep.update((furthest) => Math.max(furthest, this.step()));
  }
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Preencha os dados obrigatórios da turma.');
      return;
    }
    if (!this.days().length) {
      this.message.set('Selecione pelo menos um dia da semana.');
      this.step.set(1);
      return;
    }
    if (!this.students().length) {
      this.message.set('Selecione pelo menos um aluno.');
      this.step.set(2);
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
        this.existing ? this.back : `/turmas/${saved.id}/visao-geral?retorno=%2Fturmas`,
      );
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = inject(Router).parseUrl(this.back);
}
