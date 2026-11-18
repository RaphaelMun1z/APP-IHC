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
import { formatDate, previousClassDate } from '../../shared/utils/dates';
import { defaultClasses } from '../data/catalog';

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
      'Turmas',
      'Ciência da Computação · 3º período A',
      'Aulas',
      'Registrar aula',
    ]);
    const router = TestBed.inject(Router);
    await harness.navigateByUrl(router.serializeUrl(navigation.back()));
    expect(router.url).toBe('/turmas?busca=6');
  });
  it('detalhes e edição usam o registro e a turma da rota', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/6a/registros/demo-aula-6a');
    const navigation = TestBed.inject(PageNavigation);
    expect(
      navigation
        .page()
        .crumbs.map((item) => item.label)
        .slice(0, 3),
    ).toEqual(['Turmas', 'Ciência da Computação · 3º período A', 'Aulas']);
    expect(navigation.page().title).toContain(formatDate(previousClassDate(defaultClasses[0].dias[0])));
    await harness.navigateByUrl('/turmas/6b/aulas/demo-aula-6b/editar');
    expect(navigation.page().crumbs.map((item) => item.label)).toEqual([
      'Turmas',
      'Ciência da Computação · 5º período B',
      'Aulas',
      'Editar aula',
    ]);
  });
  it('mantém o acesso a registros antigos e restringe retornos externos', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/historico/demo-aula-6a?retorno=https%3A%2F%2Fexample.com');
    const navigation = TestBed.inject(PageNavigation);
    expect(navigation.page().crumbs.map((item) => item.label)).toEqual([
      'Turmas',
      `Registro de aula · ${formatDate(previousClassDate(defaultClasses[0].dias[0]))}`,
    ]);
    expect(TestBed.inject(Router).serializeUrl(navigation.back())).toBe('/turmas');
  });
});
