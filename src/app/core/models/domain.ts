export interface Person {
  readonly id: string;
  readonly nome: string;
}
export type Student = Person;
export type Criterion = Person;
export type Role = 'professor' | 'coordenacao';
export interface Session extends Person {
  readonly perfil: Role;
}
export interface CourseModule extends Person {
  readonly licoes: readonly string[];
}
export interface Course extends Person {
  readonly modulos: readonly CourseModule[];
}
export interface SchoolClass extends Person {
  readonly cursoId: string;
  readonly moduloId: string;
  readonly professorId: string;
  readonly dias: readonly number[];
  readonly inicio: string;
  readonly fim: string;
  readonly ativa: boolean;
  readonly alunoIds: readonly string[];
}
export type LessonType = 'regular' | 'revisao' | 'PR1' | 'PR2' | 'PR3';
export interface Lesson {
  readonly id: string;
  readonly turmaId: string;
  readonly data: string;
  readonly cursoId: string;
  readonly moduloId: string;
  readonly tipo: LessonType;
  readonly licoes: readonly string[];
  readonly notas: string;
  readonly professorId: string;
  readonly atualizadoEm: string;
}
export type LessonInput = Omit<Lesson, 'id' | 'professorId' | 'atualizadoEm'> & {
  readonly id?: string;
};
export type AttendanceMark = 'presente' | 'falta' | null;
export type AttendanceDay = Readonly<Record<string, AttendanceMark>>;
export type AttendanceData = Readonly<Record<string, Readonly<Record<string, AttendanceDay>>>>;
export type AssessmentMark = 'ok' | 'nao-ok' | null;
export interface StudentAssessment extends Person {
  readonly avaliacoes: Readonly<Record<string, AssessmentMark>>;
}
export interface Assessment {
  readonly alunos: readonly StudentAssessment[];
  readonly atualizadoEm: string;
  readonly professorId: string;
}
export type AssessmentData = Readonly<Record<string, Readonly<Record<string, Assessment>>>>;
export const lessonTypes: Readonly<Record<LessonType, string>> = {
  regular: 'Regular',
  revisao: 'Revisão',
  PR1: 'PR1',
  PR2: 'PR2',
  PR3: 'PR3',
};
