import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import type { AssessmentMark, StudentAssessment } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { AssessmentsStore, nextAssessment } from './assessments.store';
import { UnsavedChangesDirective, confirmDiscard } from '../../core/navigation/unsaved-changes';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { formatDate, localDate, requirePastDate } from '../../shared/utils/dates';

@Component({
  selector: 'app-assessments',
  imports: [ReactiveFormsModule, Feedback, UnsavedChangesDirective],
  templateUrl: './assessments.html',
  styleUrl: './assessments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Assessments implements UnsavedChanges {
  readonly classes = inject(ClassesStore);
  readonly store = inject(AssessmentsStore);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.params.get('turma') ?? this.classes.active()[0]?.id ?? '',
    data: this.params.get('data') ?? localDate(),
  });
  readonly applied = signal(this.form.getRawValue());
  readonly group = computed(() => this.classes.get(this.applied().turmaId));
  readonly rows = signal<readonly StudentAssessment[]>(
    this.store.roster(this.applied().turmaId, this.applied().data),
  );
  readonly today = localDate();
  readonly formatDate = formatDate;
  readonly dirty = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  load(): void {
    if (!confirmDiscard(this)) {
      this.form.setValue(this.applied());
      return;
    }
    try {
      requirePastDate(this.form.controls.data.value);
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
      this.form.setValue(this.applied());
      return;
    }
    this.applied.set(this.form.getRawValue());
    this.rows.set(this.store.roster(this.applied().turmaId, this.applied().data));
    this.dirty.set(false);
    this.message.set('');
  }
  cycle(studentId: string, criterionId: string): void {
    if (!this.group()?.ativa) return;
    this.rows.update((rows) =>
      rows.map((student) =>
        student.id === studentId
          ? {
              ...student,
              avaliacoes: {
                ...student.avaliacoes,
                [criterionId]: nextAssessment(student.avaliacoes[criterionId] ?? null),
              },
            }
          : student,
      ),
    );
    this.dirty.set(true);
    this.message.set('');
  }
  label(mark: AssessmentMark | undefined): string {
    return mark === 'ok'
      ? 'Atendeu ao critério'
      : mark === 'nao-ok'
        ? 'Precisa desenvolver'
        : 'Sem avaliação';
  }
  save(): void {
    try {
      this.store.save(this.applied().turmaId, this.applied().data, this.rows());
      this.dirty.set(false);
      this.isError.set(false);
      this.message.set('Avaliação salva. O registro já está disponível no histórico.');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
