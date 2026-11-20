import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import type { HttpRequest } from '@angular/common/http';
import { MockSession } from './mock-session';
import { MockClassesRepository } from './classes.repository';
import { MockLessonsRepository } from './lessons.repository';
import { MockAttendanceRepository } from './attendance.repository';
import { MockAssessmentsRepository } from './assessments.repository';
import { MockCatalogRepository } from './catalog.repository';
import { MockMonthlyTimeRepository } from './monthly-time.repository';
import { initializeDemoData } from '../../data/demo-data';
import { StorageService } from '../../data/storage.service';
import { isAssessments, isAttendance, isClass, isLessons, isMeetingList } from '../../data/validators';
import type { LessonRequest, ListResponse, StudentRequest } from '../contracts';
import { ApiFailure } from '../contracts';
import type { AttendanceData, SchoolClass, StudentAssessment } from '../../models/domain';
import { studentFields } from '../../models/domain';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function badRequest(): never {
  throw new ApiFailure(400, {
    code: 'INVALID_REQUEST',
    message: 'Formato da requisição inválido.',
  });
}
function studentBody(value: unknown): StudentRequest {
  if (!object(value) || typeof value['nome'] !== 'string') return badRequest();
  const input: StudentRequest = { nome: value['nome'] };
  for (const field of Object.keys(studentFields) as (keyof typeof studentFields)[]) {
    const entry = value[field];
    if (entry === undefined) continue;
    if (typeof entry !== 'string') return badRequest();
    input[field] = entry;
  }
  return input;
}
function classBody(value: unknown, id: string): SchoolClass {
  if (!object(value)) return badRequest();
  const input = {
    id,
    dias: [],
    nome: value['nome'],
    cursoId: value['cursoId'],
    moduloId: value['moduloId'],
    professorId: value['professorId'],
    inicio: value['inicio'],
    fim: value['fim'],
    ativa: value['ativa'],
    alunoIds: value['alunoIds'],
    faixaEtaria: value['faixaEtaria'],
    modalidade: value['modalidade'],
  };
  if (
    !isClass(input) ||
    (value['horarios'] !== undefined && !isMeetingList(value['horarios'])) ||
    !Array.isArray(value['dias']) ||
    !value['dias'].every((day: unknown) => typeof day === 'number')
  )
    return badRequest();
  return { ...input, dias: value['dias'], horarios: value['horarios'] };
}
function lessonBody(value: unknown): LessonRequest {
  if (!object(value)) return badRequest();
  const input = { ...value, id: '', professorId: '', atualizadoEm: '' };
  // Date/content validation belongs to the domain repository, with HTTP 422.
  const candidates = [{ ...input, data: '2026-01-01' }];
  if (typeof value['data'] !== 'string' || !isLessons(candidates)) return badRequest();
  const { turmaId, cursoId, moduloId, tipo, licoes, notas } = candidates[0];
  return { turmaId, cursoId, moduloId, tipo, licoes, notas, data: value['data'] };
}
function assessmentBody(value: unknown): readonly StudentAssessment[] {
  if (!object(value)) return badRequest();
  const record = { lessonId: '_', professorId: '', atualizadoEm: '', alunos: value['alunos'] };
  if (!isAssessments({ _: record })) return badRequest();
  return record.alunos as readonly StudentAssessment[];
}
function list<T>(items: readonly T[]): ListResponse<T> {
  return { items, total: items.length };
}

@Injectable({ providedIn: 'root' })
export class MockApi {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(MockSession);
  // Initialize only when the mock is actually used; real API mode never seeds local data.
  constructor() {
    initializeDemoData(this.storage);
  }

  handle(request: HttpRequest<unknown>, path: string): HttpResponse<unknown> {
    try {
      return this.route(request, path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro na simulação da API.';
      const failure =
        error instanceof ApiFailure
          ? error
          : new ApiFailure(
              /não encontrad|não matriculado/i.test(message)
                ? 404
                : /Já existe/.test(message)
                  ? 409
                  : /arquivada/.test(message)
                    ? 409
                    : /armazenamento|dados locais inválidos/i.test(message)
                      ? 503
                      : 422,
              {
                code: /Já existe/.test(message)
                  ? 'CONFLICT'
                  : /arquivada/.test(message)
                    ? 'CLASS_ARCHIVED'
                    : 'DOMAIN_ERROR',
                message,
              },
            );
      throw new HttpErrorResponse({
        status: failure.status,
        url: request.urlWithParams,
        error: failure.body,
      });
    }
  }

  private route(request: HttpRequest<unknown>, path: string): HttpResponse<unknown> {
    const method = request.method;
    const body = request.body;
    const reply = (value: unknown, status = 200) =>
      new HttpResponse({ body: value, status, url: request.urlWithParams });
    if (path === '/auth/session' && method === 'POST') {
      if (
        !object(body) ||
        typeof body['username'] !== 'string' ||
        typeof body['password'] !== 'string'
      )
        return badRequest();
      try {
        this.auth.login(body['username'], body['password'], false);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Usuário ou senha incorretos.')
          throw new ApiFailure(401, { code: 'INVALID_CREDENTIALS', message: error.message });
        throw error;
      }
      return reply(this.auth.user());
    }
    if (!this.auth.user())
      throw new ApiFailure(401, {
        code: 'UNAUTHENTICATED',
        message: 'Entre na sua conta para continuar.',
      });
    if (path === '/auth/session' && method === 'GET') return reply(this.auth.user());
    if (path === '/auth/session' && method === 'DELETE') {
      this.auth.logout();
      return reply(null, 204);
    }

    const classes = inject(MockClassesRepository);
    const lessons = inject(MockLessonsRepository);
    const attendance = inject(MockAttendanceRepository);
    const assessments = inject(MockAssessmentsRepository);
    if (path === '/catalogo') {
      const catalog = inject(MockCatalogRepository);
      if (method === 'GET') return reply(catalog.snapshot());
      if (method === 'POST')
        return reply(catalog.register(object(body) ? body : badRequest()), 201);
    }
    if (path === '/pontos-mensais') {
      const points = inject(MockMonthlyTimeRepository);
      if (method === 'GET') return reply(list(points.list()));
      if (method === 'POST') return reply(points.create(object(body) ? body : badRequest()), 201);
    }
    if (path === '/alunos' && method === 'GET') return reply(list(classes.students));
    if (path === '/turmas/fixadas' && method === 'GET')
      return reply({ turmaIds: classes.pinned().map((group) => group.id) });
    if (path === '/turmas') {
      if (method === 'GET') return reply(list(classes.accessible()));
      if (method === 'POST') return reply(classes.save(classBody(body, '')), 201);
      if (method === 'DELETE') {
        if (
          !object(body) ||
          !Array.isArray(body['ids']) ||
          !body['ids'].every((id: unknown) => typeof id === 'string')
        )
          return badRequest();
        classes.delete(body['ids']);
        return reply(null, 204);
      }
    }
    if (path === '/aulas') {
      if (method === 'GET') {
        const classId = new URL(request.urlWithParams, 'http://mock.local').searchParams.get(
          'turmaId',
        );
        return reply(
          list(lessons.records().filter((lesson) => !classId || lesson.turmaId === classId)),
        );
      }
      if (method === 'POST') return reply(lessons.save(lessonBody(body)), 201);
    }
    if (path === '/frequencias' && method === 'GET')
      return reply(
        list(Object.entries(attendance.records()).map(([turmaId, dias]) => ({ turmaId, dias }))),
      );
    if (path === '/avaliacoes' && method === 'GET')
      return reply({
        registros: Object.values(assessments.records()),
        legadasSemAula: assessments.unlinkedLegacy(),
        avisoMigracao: assessments.migrationMessage(),
      });

    const parts = path.split('/').slice(1).map(decodeURIComponent);
    const [resource, id, child, childId] = parts;
    if (resource === 'turmas' && id) {
      if (parts.length === 2 && method === 'PUT') return reply(classes.save(classBody(body, id)));
      if (parts.length === 3 && child === 'fixacao' && method === 'PATCH') {
        if (!object(body) || typeof body['fixada'] !== 'boolean') return badRequest();
        classes.require(id);
        if (classes.isPinned(id) !== body['fixada']) classes.togglePinned(id);
        return reply({ turmaIds: classes.pinned().map((group) => group.id) });
      }
      if (parts.length === 3 && child === 'alunos' && method === 'POST') {
        const aluno = classes.addStudent(id, studentBody(body));
        return reply({ aluno, turma: classes.require(id) }, 201);
      }
      if (parts.length === 3 && child === 'professores' && method === 'PUT') {
        if (
          !object(body) ||
          !Array.isArray(body['professorIds']) ||
          !body['professorIds'].every((id: unknown) => typeof id === 'string')
        )
          return badRequest();
        return reply(classes.assignTeachers(id, body['professorIds']));
      }
      if (parts.length === 4 && child === 'alunos') {
        if (method === 'PATCH') {
          return reply(classes.updateStudent(id, childId, studentBody(body)));
        }
        if (method === 'DELETE') {
          classes.removeStudent(id, childId);
          return reply(classes.require(id));
        }
      }
      if (parts.length === 3 && child === 'frequencias' && method === 'PATCH') {
        if (!object(body) || !isAttendance({ [id]: body['dias'] })) return badRequest();
        const dias = body['dias'] as AttendanceData[string];
        attendance.saveMonth(id, dias);
        return reply({ turmaId: id, dias: attendance.records()[id] });
      }
    }
    if (resource === 'aulas' && id) {
      if (parts.length === 2 && method === 'PUT')
        return reply(lessons.save({ ...lessonBody(body), id }));
      if (parts.length === 3 && child === 'avaliacao' && method === 'PUT') {
        assessments.save(id, assessmentBody(body));
        return reply(assessments.records()[id]);
      }
    }
    throw new ApiFailure(404, { code: 'NOT_FOUND', message: 'Endpoint não encontrado.' });
  }
}
