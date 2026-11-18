import { criteria, courses, defaultClasses, students } from './catalog';
import type {
  AssessmentMark,
  AttendanceData,
  LegacyAssessmentData,
  Lesson,
  LessonType,
} from '../models/domain';
import { previousClassDate } from '../../shared/utils/dates';
import type { StorageService } from './storage.service';
import { storageKeys } from './storage-keys';

export function initializeDemoData(storage: StorageService): void {
  const updated = new Date().toISOString();
  const lessons: Lesson[] = defaultClasses.map((group, index) => ({
    id: `demo-aula-${group.id}`,
    turmaId: group.id,
    data: previousClassDate(group.dias[0]),
    cursoId: group.cursoId,
    moduloId: group.moduloId,
    tipo: (['regular', 'revisao', 'PR1', 'PR2'] satisfies LessonType[])[index],
    licoes: [
      courses
        .find((course) => course.id === group.cursoId)
        ?.modulos.find((module) => module.id === group.moduloId)?.licoes[index % 4] ?? '',
    ],
    notas: [
      'Estudo de caso em grupo sobre requisitos e decisões de arquitetura.',
      'Exercícios de modelagem relacional e consultas SQL.',
      'Discussão de caso sobre planejamento e estrutura organizacional.',
      'Análise de fluxo de caixa e elaboração de orçamento em equipe.',
    ][index],
    professorId: group.professorId,
    atualizadoEm: updated,
  }));
  const attendance: AttendanceData = Object.fromEntries(
    defaultClasses.map((group) => [
      group.id,
      {
        [previousClassDate(group.dias[0])]: Object.fromEntries(
          students.map((student, index) => [student.id, index % 5 === 0 ? 'falta' : 'presente']),
        ),
      },
    ]),
  );
  const assessments: LegacyAssessmentData = Object.fromEntries(
    defaultClasses.map((group, groupIndex) => [
      group.id,
      {
        [previousClassDate(group.dias[0])]: {
          alunos: students.map((student, studentIndex) => ({
            id: student.id,
            nome: student.nome,
            avaliacoes: Object.fromEntries(
              criteria.map((criterion, criterionIndex) => {
                const mark = (studentIndex + criterionIndex + groupIndex) % 4;
                return [
                  criterion.id,
                  mark === 0 ? null : mark === 1 ? 'nao-ok' : ('ok' satisfies AssessmentMark),
                ];
              }),
            ),
          })),
          atualizadoEm: updated,
          professorId: group.professorId,
        },
      },
    ]),
  );
  storage.initialize(storageKeys.classes, defaultClasses);
  storage.initialize(storageKeys.lessons, lessons);
  storage.initialize(storageKeys.attendance, attendance);
  storage.initialize(storageKeys.assessments, assessments);
}
