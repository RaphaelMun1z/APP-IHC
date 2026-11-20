export interface Person {
  readonly id: string;
  readonly nome: string;
}
export interface Coordinator extends Person {
  readonly cpf: string;
  readonly email: string;
}
export interface Teacher extends Person {
  readonly cpf?: string;
  readonly email?: string;
  readonly telefone?: string;
}
export const studentFields = {
  cpf: 'CPF',
  dataNascimento: 'Data de nascimento',
  email: 'E-mail',
  telefone: 'Telefone',
  logradouro: 'Logradouro',
  numero: 'Número',
  bairro: 'Bairro',
  cidade: 'Cidade',
  uf: 'UF',
  cep: 'CEP',
  nomeMae: 'Nome da mãe',
  nomePai: 'Nome do pai',
} as const;
export type StudentDetails = Partial<Record<keyof typeof studentFields, string>>;
export interface Student extends Person, Readonly<StudentDetails> {
  readonly coordenadorId?: string;
}
export type Criterion = Person;
type Role = 'professor' | 'coordenacao';
export interface Session extends Person {
  readonly perfil: Role;
}
export interface CurriculumLesson {
  readonly id: string;
  readonly moduloId: string;
  readonly coordenadorId: string;
  readonly numero: number;
  readonly titulo: string;
}
export interface CourseModule extends Person {
  readonly cursoId?: string;
  readonly numero?: number;
  readonly licoes: readonly string[];
  readonly curriculo?: readonly CurriculumLesson[];
}
export interface Course extends Person {
  readonly coordenadorId?: string;
  readonly area?: string;
  readonly cargaHorariaTotal?: number;
  readonly modulos: readonly CourseModule[];
}
export interface Enrollment {
  readonly alunoId: string;
  readonly turmaId: string;
  readonly dataMatricula: string | null;
}
export interface TeachingAssignment {
  readonly professorId: string;
  readonly turmaId: string;
}
export interface MonthlyTimeRecord {
  readonly id: string;
  readonly professorId: string;
  readonly mes: number;
  readonly ano: number;
  readonly totalHorasAula: number;
}
export interface ClassMeeting {
  readonly dia: number;
  readonly inicio: string;
  readonly fim: string;
}
export interface SchoolClass extends Person {
  readonly cursoId: string;
  readonly coordenadorId?: string;
  readonly faixaEtaria?: string;
  readonly modalidade?: string;
  // The API exposes the relations alongside the fields understood by older clients.
  readonly matriculas?: readonly Enrollment[];
  readonly leciona?: readonly TeachingAssignment[];
  readonly moduloId: string;
  readonly professorId: string;
  readonly dias: readonly number[];
  readonly horarios?: readonly ClassMeeting[];
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
  readonly licaoIds?: readonly string[];
  readonly notas: string;
  readonly professorId: string;
  readonly atualizadoEm: string;
}
export type LessonInput = Omit<Lesson, 'id' | 'professorId' | 'atualizadoEm' | 'licaoIds'> & {
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
  readonly lessonId: string;
  readonly alunos: readonly StudentAssessment[];
  readonly atualizadoEm: string;
  readonly professorId: string;
}
export interface LegacyAssessment {
  readonly alunos: readonly StudentAssessment[];
  readonly atualizadoEm: string;
  readonly professorId: string;
}
export type AssessmentData = Readonly<Record<string, Assessment>>;
export type LegacyAssessmentData = Readonly<
  Record<string, Readonly<Record<string, LegacyAssessment>>>
>;
export const lessonTypes: Readonly<Record<LessonType, string>> = {
  regular: 'Regular',
  revisao: 'Revisão',
  PR1: 'PR1',
  PR2: 'PR2',
  PR3: 'PR3',
};
