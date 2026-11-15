import { provideMockApi } from '../api/api-test.providers';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { AuthService } from '../auth/auth.service';
import { initializeDemoData } from '../data/demo-data';
import { StorageService } from '../data/storage.service';
import { PageNavigation } from './page-navigation';

describe('Hierarquia de páginas', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideMockApi()] });
    initializeDemoData(TestBed.inject(StorageService));
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
  });
  it('breadcrumbs seguem a hierarquia, enquanto Voltar preserva a origem', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/6a/aulas/nova?retorno=%2Fcoordenacao%3Fbusca%3D6');
    const navigation = TestBed.inject(PageNavigation);
    expect(navigation.page().crumbs.map((item) => item.label)).toEqual([
      'Início',
      'Turmas',
      '6º ano A',
      'Aulas',
      'Registrar aula',
    ]);
    expect(TestBed.inject(Router).serializeUrl(navigation.back())).toBe('/turmas?busca=6');
  });
  it('detalhes e edição usam o registro e a turma da rota', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/6a/registros/demo-aula-6a');
    const navigation = TestBed.inject(PageNavigation);
    expect(
      navigation
        .page()
        .crumbs.map((item) => item.label)
        .slice(0, 4),
    ).toEqual(['Início', 'Turmas', '6º ano A', 'Aulas']);
    expect(navigation.page().title).toContain('09/11/2026');
    await harness.navigateByUrl('/turmas/6b/aulas/demo-aula-6b/editar');
    expect(navigation.page().crumbs.map((item) => item.label)).toEqual([
      'Início',
      'Turmas',
      '6º ano B',
      'Aulas',
      'Editar aula',
    ]);
  });
  it('mantém a hierarquia da Auditoria global e restringe retornos externos', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/historico/demo-aula-6a?retorno=https%3A%2F%2Fexample.com');
    const navigation = TestBed.inject(PageNavigation);
    expect(
      navigation
        .page()
        .crumbs.map((item) => item.label)
        .slice(0, 2),
    ).toEqual(['Início', 'Auditoria']);
    expect(TestBed.inject(Router).serializeUrl(navigation.back())).toBe('/historico');
  });
});
