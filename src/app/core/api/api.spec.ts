import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from './api.config';
import { apiInterceptor, mockInterceptor } from './api.interceptors';
import { ApiFailure } from './contracts';
import { provideMockApi, testApiConfig } from './api-test.providers';
import { RequestState } from './request-state';
import { DataState } from './data-state';
import { SessionState } from '../auth/session-state';
import { AuthService } from '../auth/auth.service';
import { ClassesApi } from '../../features/classes/classes.api';
import { ClassesStore } from '../../features/classes/classes.store';
import { LessonsApi } from '../../features/lessons/lessons.api';
import { AttendanceApi } from '../../features/attendance/attendance.api';
import { AssessmentsApi } from '../../features/assessments/assessments.api';
import { BootstrapService } from './bootstrap.service';
import { storageKeys } from '../data/storage-keys';

describe('HTTP real e interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor, mockInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { ...testApiConfig, mode: 'api' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('modo api encaminha requisições reais sem inicializar dados locais', async () => {
    const pending = firstValueFrom(TestBed.inject(ClassesApi).list());
    const request = backend.expectOne('/api/v1/turmas');
    expect(request.request.withCredentials).toBe(true);
    expect(TestBed.inject(RequestState).pending()).toBe(1);
    request.flush({ items: [], total: 0 });
    expect(await pending).toEqual({ items: [], total: 0 });
    expect(TestBed.inject(RequestState).pending()).toBe(0);
    expect(localStorage.length).toBe(0);
  });
  it('não altera requisições para outros serviços ou arquivos', async () => {
    const pending = firstValueFrom(http.get('/assets/info.json'));
    const request = backend.expectOne('/assets/info.json');
    expect(request.request.withCredentials).toBe(false);
    expect(TestBed.inject(RequestState).pending()).toBe(0);
    request.flush({ ok: true });
    await pending;
  });
  it('normaliza falha de conexão e HTML de proxy, liberando o loading', async () => {
    const pending = firstValueFrom(http.get('/api/v1/turmas'));
    const error = expect(pending).rejects.toMatchObject({
      status: 0,
      body: { code: 'CONNECTION_ERROR' },
    });
    backend.expectOne('/api/v1/turmas').error(new ProgressEvent('error'));
    await error;
    const second = firstValueFrom(http.get('/api/v1/turmas'));
    const secondError = expect(second).rejects.toMatchObject({
      status: 502,
      body: { code: 'HTTP_502' },
    });
    backend
      .expectOne('/api/v1/turmas')
      .flush('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' });
    await secondError;
    expect(TestBed.inject(RequestState).pending()).toBe(0);
  });
  it('401 invalida a sessão validada e limpa os dados em memória', async () => {
    const state = TestBed.inject(SessionState);
    state.user.set({ id: 'professor-01', nome: 'Mariana Oliveira', perfil: 'professor' });
    TestBed.inject(DataState).ready.set(true);
    const pending = firstValueFrom(http.get('/api/v1/turmas'));
    const error = expect(pending).rejects.toMatchObject({ status: 401 });
    backend
      .expectOne('/api/v1/turmas')
      .flush(
        { code: 'UNAUTHENTICATED', message: 'Sessão expirada.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await error;
    expect(state.user()).toBeNull();
    expect(TestBed.inject(DataState).ready()).toBe(false);
  });
  it('conserva o corpo de erros de validação enviado pelo backend', async () => {
    const pending = firstValueFrom(http.post('/api/v1/turmas', {}));
    const error = expect(pending).rejects.toMatchObject({
      status: 422,
      body: { details: { nome: ['Obrigatório'] } },
    });
    backend.expectOne('/api/v1/turmas').flush(
      {
        code: 'VALIDATION_ERROR',
        message: 'Confira os campos.',
        details: { nome: ['Obrigatório'] },
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await error;
  });
  it('serializa filtros e mutações por domínio com os contratos previstos', async () => {
    const lessons = TestBed.inject(LessonsApi);
    const attendance = TestBed.inject(AttendanceApi);
    const assessments = TestBed.inject(AssessmentsApi);
    const list = firstValueFrom(lessons.list({ turmaId: '6a' }));
    backend.expectOne('/api/v1/aulas?turmaId=6a').flush({ items: [], total: 0 });
    await list;
    const body = { dias: { '2026-01-01': { 'aluno-01': null } } };
    const saved = firstValueFrom(attendance.save('6a', body));
    const patch = backend.expectOne('/api/v1/turmas/6a/frequencias');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual(body);
    patch.flush({ turmaId: '6a', ...body });
    await saved;
    const evaluation = firstValueFrom(assessments.save('aula/1', { alunos: [] }));
    const put = backend.expectOne('/api/v1/aulas/aula%2F1/avaliacao');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ alunos: [] });
    put.flush({
      lessonId: 'aula/1',
      alunos: [],
      atualizadoEm: '2026-01-01T12:00:00Z',
      professorId: 'professor-01',
    });
    await evaluation;
  });
  it('não publica um carregamento parcial e permite repetir após erro', async () => {
    const bootstrap = TestBed.inject(BootstrapService);
    const state = TestBed.inject(DataState);
    const load = firstValueFrom(bootstrap.load());
    backend.expectOne('/api/v1/turmas').flush({ items: [], total: 0 });
    backend
      .expectOne('/api/v1/alunos')
      .flush('Offline', { status: 503, statusText: 'Unavailable' });
    backend.match(() => true); // The remaining forkJoin requests were cancelled.
    expect(await load).toBe(false);
    expect(state.ready()).toBe(false);
    expect(state.classes()).toEqual([]);
    expect(state.error()).toBeTruthy();
    const retry = firstValueFrom(bootstrap.load());
    for (const request of backend.match(() => true)) {
      const url = request.request.url;
      request.flush(
        url.endsWith('catalogo')
          ? { cursos: [], professores: [], criterios: [] }
          : url.endsWith('fixadas')
            ? { turmaIds: [] }
            : url.endsWith('avaliacoes')
              ? { registros: [], legadasSemAula: [], avisoMigracao: '' }
              : { items: [], total: 0 },
      );
    }
    expect(await retry).toBe(true);
    expect(state.ready()).toBe(true);
    expect(state.error()).toBe('');
  });
});

describe('Endpoints mockados pela pilha HttpClient', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
    await firstValueFrom(TestBed.inject(BootstrapService).load());
  });
  it('retorna 400, 404, 409 e 422 sem alterar dados após falhas', async () => {
    const http = TestBed.inject(HttpClient);
    const before = localStorage.getItem(storageKeys.classes);
    await expect(firstValueFrom(http.post('/api/v1/turmas', {}))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      firstValueFrom(http.patch('/api/v1/turmas/inexistente/fixacao', { fixada: true })),
    ).rejects.toMatchObject({ status: 404 });
    await expect(firstValueFrom(http.get('/api/v1/inexistente'))).rejects.toMatchObject({
      status: 404,
    });
    await expect(TestBed.inject(ClassesStore).addStudent('6a', '   ')).rejects.toMatchObject({
      status: 422,
    });
    const group = TestBed.inject(ClassesStore).require('6a');
    const { id: _id, ...body } = group;
    expect(_id).toBe('6a');
    await expect(firstValueFrom(TestBed.inject(ClassesApi).create(body))).rejects.toMatchObject({
      status: 409,
    });
    expect(localStorage.getItem(storageKeys.classes)).toBe(before);
  });
  it('fixação PATCH é idempotente e persiste na ordem escolhida', async () => {
    const api = TestBed.inject(ClassesApi);
    await firstValueFrom(api.pin('6b', true));
    await firstValueFrom(api.pin('6a', true));
    await firstValueFrom(api.pin('6b', true));
    expect(await firstValueFrom(api.pins())).toEqual({ turmaIds: ['6b', '6a'] });
  });
  it('bloqueia mutações simultâneas e não altera o cache antes da resposta', async () => {
    const classes = TestBed.inject(ClassesStore);
    const first = classes.addStudent('6a', 'Novo aluno');
    expect(classes.students).toHaveLength(15);
    expect(TestBed.inject(RequestState).saving()).toBe(true);
    await expect(classes.addStudent('6a', 'Duplicado')).rejects.toMatchObject({
      body: { code: 'OPERATION_PENDING' },
    });
    await first;
    expect(classes.students).toHaveLength(16);
    expect(TestBed.inject(RequestState).saving()).toBe(false);
  });
  it('falha de armazenamento reverte criação e matrícula e libera nova tentativa', async () => {
    const classes = TestBed.inject(ClassesStore);
    const before = localStorage.getItem(storageKeys.students);
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === storageKeys.classes && fail) {
        fail = false;
        throw new Error('quota');
      }
      original.call(this, key, value);
    };
    try {
      await expect(classes.addStudent('6a', 'Teste')).rejects.toBeInstanceOf(ApiFailure);
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(classes.students).toHaveLength(15);
    expect(localStorage.getItem(storageKeys.students)).toBe(before);
    await classes.addStudent('6a', 'Teste');
    expect(classes.students).toHaveLength(16);
  });
});

describe('Latência e indisponibilidade simuladas', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });
  it('timeout cancela a operação antes da persistência e libera os indicadores', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideMockApi(),
        {
          provide: API_CONFIG,
          useValue: {
            ...testApiConfig,
            timeoutMs: 10,
            mock: { latencyMs: 100, failureStatus: null },
          },
        },
      ],
    });
    await expect(
      TestBed.inject(AuthService).login('professor', 'ipb123', false),
    ).rejects.toMatchObject({ body: { code: 'TIMEOUT' } });
    expect(sessionStorage.getItem(storageKeys.session)).toBeNull();
    expect(TestBed.inject(RequestState).pending()).toBe(0);
    expect(TestBed.inject(RequestState).saving()).toBe(false);
  });
  it.each([0, 500, 503])('simula falha %s pela configuração central', async (status) => {
    TestBed.configureTestingModule({
      providers: [
        provideMockApi(),
        {
          provide: API_CONFIG,
          useValue: {
            ...testApiConfig,
            mock: { latencyMs: 0, failureStatus: status },
          },
        },
      ],
    });
    await expect(firstValueFrom(TestBed.inject(ClassesApi).list())).rejects.toMatchObject({
      status,
    });
    expect(TestBed.inject(RequestState).pending()).toBe(0);
  });
});
