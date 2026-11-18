import { Injectable, computed, inject, signal } from '@angular/core';
import { MockSession } from './mock-session';
import { StorageService } from '../../data/storage.service';
import { storageKeys } from '../../data/storage-keys';
import { criteria } from '../../data/catalog';
import { isAssessments, isLegacyAssessments } from '../../data/validators';
import type {
  Assessment,
  AssessmentData,
  LegacyAssessment,
  LegacyAssessmentData,
  StudentAssessment,
} from '../../models/domain';
import { requirePastDate } from '../../../shared/utils/dates';
import { MockClassesRepository } from './classes.repository';
import { MockLessonsRepository } from './lessons.repository';
import { ApiFailure } from '../contracts';
import { teaches } from '../../data/academic-records';

interface UnlinkedAssessment {
  readonly classId: string;
  readonly date: string;
  readonly assessment: LegacyAssessment;
}

@Injectable({ providedIn: 'root' })
export class MockAssessmentsRepository {
  private readonly storage = inject(StorageService);
  private readonly classes = inject(MockClassesRepository);
  private readonly lessons = inject(MockLessonsRepository);
  private readonly auth = inject(MockSession);
  private readonly all = this.storage.collection<AssessmentData>(
    storageKeys.lessonAssessments,
    {},
    isAssessments,
  );
  private readonly legacy = this.storage.collection<LegacyAssessmentData>(
    storageKeys.assessments,
    {},
    isLegacyAssessments,
  );
  readonly records = computed<AssessmentData>(() => {
    const records: Record<string, Assessment> = {};
    for (const lesson of this.lessons.records()) {
      const saved = this.all()[lesson.id];
      const legacy = this.legacy()[lesson.turmaId]?.[lesson.data];
      const assessment = saved ?? (legacy ? { ...legacy, lessonId: lesson.id } : undefined);
      if (assessment) records[lesson.id] = assessment;
    }
    return records;
  });
  readonly unlinkedLegacy = computed<readonly UnlinkedAssessment[]>(() => {
    const accessibleIds = new Set(this.classes.accessible().map((group) => group.id));
    const lessons = this.lessons.records();
    return Object.entries(this.legacy()).flatMap(([classId, dates]) =>
      accessibleIds.has(classId)
        ? Object.entries(dates)
            .filter(
              ([date]) =>
                !lessons.some((lesson) => lesson.turmaId === classId && lesson.data === date),
            )
            .map(([date, assessment]) => ({ classId, date, assessment }))
        : [],
    );
  });
  readonly criteria = criteria;
  readonly migrationMessage = signal('');

  constructor() {
    const linked: Record<string, Assessment> = { ...this.all() };
    const remaining: Record<string, Record<string, LegacyAssessment>> = {};
    let migrated = false;
    for (const [classId, dates] of Object.entries(this.legacy())) {
      for (const [date, legacy] of Object.entries(dates)) {
        const lesson = this.lessons
          .records()
          .find((item) => item.turmaId === classId && item.data === date);
        if (!lesson) {
          (remaining[classId] ??= {})[date] = legacy;
          continue;
        }
        linked[lesson.id] ??= { ...legacy, lessonId: lesson.id };
        migrated = true;
      }
    }
    if (migrated) {
      try {
        this.storage.writeMany([
          [storageKeys.lessonAssessments, linked],
          [storageKeys.assessments, remaining],
        ]);
      } catch (error: unknown) {
        this.migrationMessage.set(
          `As avaliações antigas foram preservadas, mas a vinculação às aulas não foi salva. ${error instanceof Error ? error.message : 'Tente novamente.'}`,
        );
      }
    }
  }

  roster(lessonId: string): readonly StudentAssessment[] {
    const lesson = this.lessons.records().find((item) => item.id === lessonId);
    if (!lesson) return [];
    const previous = this.records()[lessonId]?.alunos ?? [];
    return this.classes.roster(lesson.turmaId).map((student) => ({
      id: student.id,
      nome: student.nome,
      avaliacoes: Object.fromEntries(
        criteria.map((criterion) => [
          criterion.id,
          previous.find((item) => item.id === student.id)?.avaliacoes[criterion.id] ?? null,
        ]),
      ),
    }));
  }

  save(lessonId: string, values: readonly StudentAssessment[]): void {
    const lesson = this.lessons.records().find((item) => item.id === lessonId);
    if (!lesson) throw new Error('Aula não encontrada.');
    const group = this.classes.require(lesson.turmaId, true);
    requirePastDate(lesson.data);
    const user = this.auth.user();
    if (!user || !teaches(group, user))
      throw new ApiFailure(403, { code: 'FORBIDDEN', message: 'Somente professores vinculados à turma podem salvar avaliações.' });
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
      this.records()[lessonId]?.alunos.filter((student) => !group.alunoIds.includes(student.id)) ??
      [];
    const remainingLegacy = { ...this.legacy() };
    const classLegacy = { ...(remainingLegacy[lesson.turmaId] ?? {}) };
    delete classLegacy[lesson.data];
    if (Object.keys(classLegacy).length) remainingLegacy[lesson.turmaId] = classLegacy;
    else delete remainingLegacy[lesson.turmaId];
    this.storage.writeMany([
      [
        storageKeys.lessonAssessments,
        {
          ...this.all(),
          [lessonId]: {
            lessonId,
            alunos: [...oldStudents, ...values.map(({ id, nome, avaliacoes }) => ({ id, nome, avaliacoes }))],
            atualizadoEm: new Date().toISOString(),
            professorId: user.id,
          },
        },
      ],
      [storageKeys.assessments, remainingLegacy],
    ]);
  }
}
