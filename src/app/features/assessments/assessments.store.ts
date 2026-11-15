import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import type {
  Assessment,
  AssessmentData,
  AssessmentMark,
  StudentAssessment,
} from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { LessonsStore } from '../lessons/lessons.store';
import { AssessmentsApi } from './assessments.api';
export type { UnlinkedAssessmentDto as UnlinkedAssessment } from '../../core/api/contracts';

export function nextAssessment(mark: AssessmentMark): AssessmentMark {
  return mark === null ? 'ok' : mark === 'ok' ? 'nao-ok' : null;
}

@Injectable({ providedIn: 'root' })
export class AssessmentsStore {
  private readonly state = inject(DataState);
  private readonly classes = inject(ClassesStore);
  private readonly lessons = inject(LessonsStore);
  private readonly api = inject(AssessmentsApi);
  private readonly requests = inject(RequestState);
  readonly records = computed<AssessmentData>(() => {
    const records: Record<string, Assessment> = {};
    for (const lesson of this.lessons.records()) {
      const legacy = this.state
        .unlinked()
        .find((item) => item.classId === lesson.turmaId && item.date === lesson.data);
      const value =
        this.state.assessments()[lesson.id] ??
        (legacy ? { ...legacy.assessment, lessonId: lesson.id } : undefined);
      if (value) records[lesson.id] = value;
    }
    return records;
  });
  readonly unlinkedLegacy = computed(() =>
    this.state
      .unlinked()
      .filter(
        (item) =>
          this.classes.get(item.classId) &&
          !this.lessons
            .records()
            .some((lesson) => lesson.turmaId === item.classId && lesson.data === item.date),
      ),
  );
  get criteria() {
    return this.state.catalog().criterios;
  }
  readonly migrationMessage = this.state.migrationMessage.asReadonly();
  roster(lessonId: string): readonly StudentAssessment[] {
    const lesson = this.lessons.records().find((item) => item.id === lessonId);
    if (!lesson) return [];
    const previous = this.records()[lessonId]?.alunos ?? [];
    return this.classes.roster(lesson.turmaId).map((student) => ({
      ...student,
      avaliacoes: Object.fromEntries(
        this.criteria.map((criterion) => [
          criterion.id,
          previous.find((item) => item.id === student.id)?.avaliacoes[criterion.id] ?? null,
        ]),
      ),
    }));
  }
  async save(lessonId: string, values: readonly StudentAssessment[]): Promise<void> {
    await this.requests.mutate(
      this.api.save(lessonId, { alunos: values }).pipe(
        tap((saved) => {
          this.state.assessments.update((records) => ({ ...records, [saved.lessonId]: saved }));
          const lesson = this.lessons.records().find((item) => item.id === saved.lessonId);
          this.state.unlinked.update((items) =>
            items.filter((item) => item.classId !== lesson?.turmaId || item.date !== lesson?.data),
          );
        }),
      ),
    );
  }
}
