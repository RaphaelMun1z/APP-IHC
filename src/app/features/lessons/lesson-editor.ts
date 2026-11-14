import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClassesStore } from '../classes/classes.store';
import { LessonsStore } from './lessons.store';
import type { LessonType } from '../../core/models/domain';
import { lessonTypes } from '../../core/models/domain';
import { UnsavedChangesDirective } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { localDate } from '../../shared/utils/dates';

@Component({
  selector: 'app-lesson-editor',
  imports: [ReactiveFormsModule, RouterLink, Feedback, UnsavedChangesDirective],
  templateUrl: './lesson-editor.html',
  styleUrl: './lesson-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonEditor implements UnsavedChanges {
  readonly classes = inject(ClassesStore);
  private readonly lessons = inject(LessonsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly initialId = this.route.snapshot.queryParamMap.get('id');
  private readonly existing = this.lessons.records().find((lesson) => lesson.id === this.initialId);
  readonly recordId = signal(this.existing?.id);
  readonly unavailable =
    !!this.initialId && (!this.existing || !this.classes.get(this.existing.turmaId)?.ativa);
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: [
      this.existing?.turmaId ??
        this.route.snapshot.queryParamMap.get('turma') ??
        this.classes.active()[0]?.id ??
        '',
      Validators.required,
    ],
    data: [this.existing?.data ?? localDate(), Validators.required],
    cursoId: [this.existing?.cursoId ?? '', Validators.required],
    moduloId: [this.existing?.moduloId ?? '', Validators.required],
    tipo: [this.existing?.tipo ?? ('regular' as LessonType), Validators.required],
    licoes: [this.existing?.licoes ?? ([] as readonly string[])],
    notas: [this.existing?.notas ?? '', Validators.maxLength(600)],
  });
  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  readonly modules = computed(() => this.classes.course(this.value().cursoId ?? '')?.modulos ?? []);
  readonly availableLessons = computed(
    () =>
      this.classes.module(this.value().cursoId ?? '', this.value().moduloId ?? '')?.licoes ?? [],
  );
  readonly selectedLessons = computed(() => this.value().licoes ?? []);
  readonly types = Object.entries(lessonTypes).map(([value, label]) => ({ value, label }));
  readonly today = localDate();
  readonly step = signal(0);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly saved = signal(false);
  constructor() {
    if (!this.existing) this.selectClass();
  }
  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }
  selectClass(): void {
    const group = this.classes.get(this.form.controls.turmaId.value);
    this.form.patchValue({
      cursoId: group?.cursoId ?? '',
      moduloId: group?.moduloId ?? '',
      licoes: [],
    });
    this.saved.set(false);
  }
  selectCourse(): void {
    this.form.patchValue({ moduloId: '', licoes: [] });
  }
  selectModule(): void {
    this.form.controls.licoes.setValue([]);
  }
  toggleLesson(lesson: string): void {
    this.form.controls.licoes.setValue(toggleValue(this.form.controls.licoes.value, lesson));
    this.form.markAsDirty();
  }
  next(): void {
    const values = this.form.getRawValue();
    if (
      this.step() === 0 &&
      (!values.turmaId ||
        !values.cursoId ||
        !values.moduloId ||
        !values.data ||
        values.data > this.today)
    ) {
      this.isError.set(true);
      this.message.set('Selecione a turma, o curso, o módulo e uma data válida, até hoje.');
      return;
    }
    if (this.step() === 1 && !values.licoes.length) {
      this.isError.set(true);
      this.message.set('Selecione pelo menos uma lição.');
      return;
    }
    this.message.set('');
    this.step.update((step) => Math.min(2, step + 1));
  }
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.isError.set(true);
      this.message.set('Confira os campos obrigatórios e o limite de 600 caracteres.');
      return;
    }
    try {
      const saved = this.lessons.save({ ...this.form.getRawValue(), id: this.recordId() });
      this.recordId.set(saved.id);
      this.form.markAsPristine();
      this.isError.set(false);
      this.saved.set(true);
      this.message.set('Aula salva. O registro já está disponível no histórico.');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { id: saved.id },
        replaceUrl: true,
      });
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
