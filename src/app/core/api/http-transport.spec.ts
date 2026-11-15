import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from './api.config';
import { provideMockApi, testApiConfig } from './api-test.providers';
import { AuthService } from '../auth/auth.service';
import { BootstrapService } from './bootstrap.service';
import { DataState } from './data-state';
import { RequestState } from './request-state';
import { ClassesApi } from '../../features/classes/classes.api';

// Opt-in suite: real HttpClient/FetchBackend -> local Postman simulation.
describe.skipIf(process.env['IPB_HTTP_SIMULATION'] !== '1')(
  'Transporte HTTP contra simulação local',
  () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      localStorage.clear();
      sessionStorage.clear();
    });
    function configure(member: string, timeoutMs = 3000) {
      TestBed.configureTestingModule({
        providers: [
          provideMockApi(),
          {
            provide: API_CONFIG,
            useValue: {
              ...testApiConfig,
              mode: 'api',
              baseUrl: `http://127.0.0.1:4011/${member}/api/v1`,
              timeoutMs,
            },
          },
        ],
      });
    }
    it('autentica e carrega os sete snapshots pelo FetchBackend real', async () => {
      configure('ipb');
      await TestBed.inject(AuthService).login('professor', 'ipb123', false);
      expect(await firstValueFrom(TestBed.inject(BootstrapService).load())).toBe(true);
      const state = TestBed.inject(DataState);
      expect(state.ready()).toBe(true);
      expect(state.classes()[0]?.id).toBe('turma-exemplo');
      expect(state.students()[0]?.id).toBe('aluno-01');
      expect(state.lessons()[0]?.id).toBe('aula-exemplo');
      expect(state.assessments()['aula-exemplo']).toBeDefined();
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(TestBed.inject(RequestState).pending()).toBe(0);
    });
    it('propaga HTTP 503 real sem publicar um snapshot incompleto', async () => {
      configure('unavailable');
      expect(await firstValueFrom(TestBed.inject(BootstrapService).load())).toBe(false);
      expect(TestBed.inject(DataState).ready()).toBe(false);
      expect(TestBed.inject(DataState).error()).toBeTruthy();
      expect(TestBed.inject(RequestState).pending()).toBe(0);
    });
    it('cancela uma conexão lenta pelo timeout configurado', async () => {
      configure('slow', 20);
      await expect(firstValueFrom(TestBed.inject(ClassesApi).list())).rejects.toMatchObject({
        body: { code: 'TIMEOUT' },
      });
      expect(TestBed.inject(RequestState).pending()).toBe(0);
    });
  },
);
