import type {
  AssessmentData,
  AttendanceData,
  Lesson,
  SchoolClass,
  Session,
  Student,
} from '../models/domain';
import { isDate } from '../../shared/utils/dates';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
export function isSession(value: unknown): value is Session {
  return (
    record(value) &&
    typeof value['id'] === 'string' &&
    typeof value['nome'] === 'string' &&
    (value['perfil'] === 'professor' || value['perfil'] === 'coordenacao')
  );
}
export function isStudents(value: unknown): value is Student[] {
  return (
    Array.isArray(value) &&
    value.every(
      (student) =>
        record(student) &&
        typeof student['id'] === 'string' &&
        !!student['id'].trim() &&
        typeof student['nome'] === 'string' &&
        !!student['nome'].trim() &&
        student['nome'].length <= 100,
    ) &&
    new Set(value.map((student) => student.id)).size === value.length
  );
}
export function isClass(value: unknown): value is SchoolClass {
  return (
    record(value) &&
    ['id', 'nome', 'cursoId', 'moduloId', 'professorId', 'inicio', 'fim'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    typeof value['ativa'] === 'boolean' &&
    strings(value['alunoIds']) &&
    Array.isArray(value['dias']) &&
    value['dias'].every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}
export function isClasses(value: unknown): value is SchoolClass[] {
  return Array.isArray(value) && value.every(isClass);
}
export function isLessons(value: unknown): value is Lesson[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        record(item) &&
        ['id', 'turmaId', 'cursoId', 'moduloId', 'notas', 'professorId', 'atualizadoEm'].every(
          (key) => typeof item[key] === 'string',
        ) &&
        typeof item['data'] === 'string' &&
        isDate(item['data']) &&
        strings(item['licoes']) &&
        ['regular', 'revisao', 'PR1', 'PR2', 'PR3'].includes(String(item['tipo'])),
    )
  );
}
export function isAttendance(value: unknown): value is AttendanceData {
  return (
    record(value) &&
    Object.values(value).every(
      (dates) =>
        record(dates) &&
        Object.entries(dates).every(
          ([date, day]) =>
            isDate(date) &&
            record(day) &&
            Object.values(day).every(
              (mark) => mark === null || mark === 'presente' || mark === 'falta',
            ),
        ),
    )
  );
}
export function normalizeAttendance(value: unknown): unknown {
  return record(value) && Object.keys(value).some(isDate) ? { '6a': value } : value;
}
export function isAssessments(value: unknown): value is AssessmentData {
  return (
    record(value) &&
    Object.values(value).every(
      (dates) =>
        record(dates) &&
        Object.entries(dates).every(
          ([date, item]) =>
            isDate(date) &&
            record(item) &&
            typeof item['professorId'] === 'string' &&
            typeof item['atualizadoEm'] === 'string' &&
            Array.isArray(item['alunos']) &&
            item['alunos'].every(
              (student) =>
                record(student) &&
                typeof student['id'] === 'string' &&
                typeof student['nome'] === 'string' &&
                record(student['avaliacoes']) &&
                Object.values(student['avaliacoes']).every(
                  (mark) => mark === null || mark === 'ok' || mark === 'nao-ok',
                ),
            ),
        ),
    )
  );
}
