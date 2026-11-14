import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { StorageService } from '../../core/data/storage.service';
import { storageKeys } from '../../core/data/storage-keys';
import { criteria } from '../../core/data/catalog';
import { isAssessments } from '../../core/data/validators';
import type { AssessmentData, AssessmentMark, StudentAssessment } from '../../core/models/domain';
import { requirePastDate } from '../../shared/utils/dates';
import { ClassesStore } from '../classes/classes.store';

export function nextAssessment(mark: AssessmentMark): AssessmentMark {
  return mark === null ? 'ok' : mark === 'ok' ? 'nao-ok' : null;
}
@Injectable({ providedIn: 'root' })
export class AssessmentsStore {
  private readonly storage = inject(StorageService);
  private readonly classes = inject(ClassesStore);
  private readonly auth = inject(AuthService);
  private readonly all = this.storage.collection<AssessmentData>(
    storageKeys.assessments,
    {},
    isAssessments,
  );
  readonly records = computed<AssessmentData>(() =>
    Object.fromEntries(
      this.classes.accessible().map((group) => [group.id, this.all()[group.id] ?? {}]),
    ),
  );
  readonly criteria = criteria;
  roster(classId: string, date: string): readonly StudentAssessment[] {
    const previous = this.records()[classId]?.[date]?.alunos ?? [];
    return this.classes.roster(classId).map((student) => ({
      ...student,
      avaliacoes: Object.fromEntries(
        criteria.map((criterion) => [
          criterion.id,
          previous.find((item) => item.id === student.id)?.avaliacoes[criterion.id] ?? null,
        ]),
      ),
    }));
  }
  save(classId: string, date: string, values: readonly StudentAssessment[]): void {
    const group = this.classes.require(classId, true);
    requirePastDate(date);
    const user = this.auth.user();
    if (!user) throw new Error('Entre na sua conta para salvar.');
    if (
      values.length !== group.alunoIds.length ||
      new Set(values.map((student) => student.id)).size !== values.length ||
      values.some(
        (student) =>
          !group.alunoIds.includes(student.id) ||
          Object.entries(student.avaliacoes).some(
            ([id, mark]) =>
              !criteria.some((criterion) => criterion.id === id) ||
              (mark !== null && mark !== 'ok' && mark !== 'nao-ok'),
          ),
      )
    )
      throw new Error('A avaliação contém alunos ou critérios inválidos.');
    const oldStudents =
      this.all()[classId]?.[date]?.alunos.filter(
        (student) => !group.alunoIds.includes(student.id),
      ) ?? [];
    this.storage.write(storageKeys.assessments, {
      ...this.all(),
      [classId]: {
        ...this.all()[classId],
        [date]: {
          alunos: [...oldStudents, ...values],
          atualizadoEm: new Date().toISOString(),
          professorId: user.id,
        },
      },
    });
  }
}
