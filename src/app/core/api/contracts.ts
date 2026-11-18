import type {
  Assessment,
  AttendanceDay,
  Course,
  Coordinator,
  Criterion,
  LegacyAssessment,
  Lesson,
  SchoolClass,
  Session,
  Student,
  StudentDetails,
  StudentAssessment,
  Teacher,
} from '../models/domain';

// DTOs intentionally keep the field names already used by the application.
export type ClassDto = SchoolClass;
export type ClassRequest = Omit<SchoolClass, 'id'>;
export type LessonDto = Lesson;
export type LessonRequest = Omit<Lesson, 'id' | 'professorId' | 'atualizadoEm' | 'licaoIds'>;
export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}
export type SessionDto = Session;
export interface StudentRequest extends StudentDetails {
  readonly nome: string;
}
export type CatalogRegistration =
  | {
      tipo: 'coordenador' | 'professor';
      nome: string;
      cpf: string;
      email: string;
      telefone?: string;
    }
  | { tipo: 'curso'; nome: string; area: string; cargaHorariaTotal: number }
  | { tipo: 'modulo'; cursoId: string; nome: string; numero: number }
  | { tipo: 'licao'; cursoId: string; moduloId: string; titulo: string; numero: number };
export interface EnrollmentResponse {
  readonly aluno: Student;
  readonly turma: ClassDto;
}
export interface PinRequest {
  readonly fixada: boolean;
}
export interface PinsDto {
  readonly turmaIds: readonly string[];
}
export interface DeleteClassesRequest {
  readonly ids: readonly string[];
}
export interface CatalogDto {
  readonly cursos: readonly Course[];
  readonly professores: readonly Teacher[];
  readonly coordenadores?: readonly Coordinator[];
  readonly criterios: readonly Criterion[];
}
export interface AttendanceRequest {
  readonly dias: Readonly<Record<string, AttendanceDay>>;
}
export interface AttendanceDto extends AttendanceRequest {
  readonly turmaId: string;
}
export interface AssessmentRequest {
  readonly alunos: readonly StudentAssessment[];
}
export type AssessmentDto = Assessment;
export interface UnlinkedAssessmentDto {
  readonly classId: string;
  readonly date: string;
  readonly assessment: LegacyAssessment;
}
export interface AssessmentsDto {
  readonly registros: readonly AssessmentDto[];
  readonly legadasSemAula: readonly UnlinkedAssessmentDto[];
  readonly avisoMigracao: string;
}
export interface ListResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
}
// Collections are complete snapshots. Existing pagination, sorting and filters
// remain in the presentation layer; no invented server pagination parameters.
export interface LessonFilters {
  readonly turmaId?: string;
}
export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, readonly string[]>>;
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiFailure';
  }
}
