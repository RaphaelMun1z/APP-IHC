import { readFileSync } from 'node:fs';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { provideMockApi } from './api-test.providers';

interface Media {
  schema: object;
  example: unknown;
}
interface Operation {
  requestBody?: { content: Record<string, Media> };
  responses: Record<string, { content?: Record<string, Media> }>;
}
interface Specification {
  paths: Record<string, Record<string, Operation>>;
  components: object;
}

describe('Conformidade OpenAPI dos mocks HTTP', () => {
  it('valida requests e responses reais das 21 operações contra a especificação', async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    const spec = parse(readFileSync('docs/openapi.yaml', 'utf8')) as Specification;
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const http = TestBed.inject(HttpClient);
    const covered = new Set<string>();
    async function call(
      method: string,
      path: string,
      url = path,
      body?: unknown,
    ): Promise<unknown> {
      const operation = spec.paths[path][method.toLowerCase()];
      expect(operation, `${method} ${path}`).toBeDefined();
      if (operation.requestBody) {
        const validate = ajv.compile({
          ...operation.requestBody.content['application/json'].schema,
          components: spec.components,
        });
        expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
      }
      const response = await firstValueFrom(
        http.request<unknown>(method, `/api/v1${url}`, { body, observe: 'response' }),
      );
      const media = operation.responses[String(response.status)]?.content?.['application/json'];
      expect(operation.responses[String(response.status)]).toBeDefined();
      if (media) {
        const validate = ajv.compile({ ...media.schema, components: spec.components });
        expect(
          validate(response.body),
          `${method} ${path}: ${JSON.stringify(validate.errors)}`,
        ).toBe(true);
      } else expect(response.body).toBeNull();
      covered.add(`${method.toLowerCase()} ${path}`);
      return response.body;
    }
    await call('POST', '/auth/session', undefined, { username: 'professor', password: 'ipb123' });
    await call('GET', '/auth/session');
    await call('GET', '/catalogo');
    await call('GET', '/alunos');
    const request = spec.paths['/turmas']['post'].requestBody!.content['application/json'].example;
    const created = (await call('POST', '/turmas', undefined, request)) as { id: string };
    await call('PUT', '/turmas/{turmaId}', `/turmas/${created.id}`, request);
    await call('GET', '/turmas');
    await call('GET', '/turmas/fixadas');
    await call('PATCH', '/turmas/{turmaId}/fixacao', `/turmas/${created.id}/fixacao`, {
      fixada: true,
    });
    const enrollment = (await call(
      'POST',
      '/turmas/{turmaId}/alunos',
      `/turmas/${created.id}/alunos`,
      { nome: 'Aluno de contrato' },
    )) as { aluno: { id: string } };
    await call(
      'PATCH',
      '/turmas/{turmaId}/alunos/{alunoId}',
      `/turmas/${created.id}/alunos/${enrollment.aluno.id}`,
      { nome: 'Nome atualizado' },
    );
    await call(
      'DELETE',
      '/turmas/{turmaId}/alunos/{alunoId}',
      `/turmas/${created.id}/alunos/${enrollment.aluno.id}`,
    );
    const lessonRequest = {
      turmaId: created.id,
      data: '2026-01-01',
      cursoId: 'formacao',
      moduloId: 'identidade',
      tipo: 'regular',
      licoes: ['Quem sou eu'],
      notas: '',
    };
    const lesson = (await call('POST', '/aulas', undefined, lessonRequest)) as { id: string };
    await call('PUT', '/aulas/{aulaId}', `/aulas/${lesson.id}`, {
      ...lessonRequest,
      notas: 'Editada',
    });
    await call('GET', '/aulas', `/aulas?turmaId=${created.id}`);
    await call('GET', '/frequencias');
    await call('PATCH', '/turmas/{turmaId}/frequencias', `/turmas/${created.id}/frequencias`, {
      dias: { '2026-01-01': { 'aluno-01': null } },
    });
    await call('GET', '/avaliacoes');
    await call('PUT', '/aulas/{aulaId}/avaliacao', `/aulas/${lesson.id}/avaliacao`, {
      alunos: [{ id: 'aluno-01', nome: 'Ana Clara Santos', avaliacoes: { criatividade: 'ok' } }],
    });
    await call('DELETE', '/turmas', undefined, { ids: [created.id] });
    await call('DELETE', '/auth/session');
    const expected = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method} ${path}`),
    );
    expect([...covered].sort()).toEqual(expected.sort());
  });
});
