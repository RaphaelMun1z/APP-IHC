import { provideMockApi } from '../api/api-test.providers';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { AuthService } from '../auth/auth.service';
import { initializeDemoData } from '../data/demo-data';
import { StorageService } from '../data/storage.service';
import { safeReturn } from '../auth/auth.guards';
import { ClassesStore } from '../../features/classes/classes.store';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';

describe('Navegação contextual e acesso do professor', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideMockApi()] });
    initializeDemoData(TestBed.inject(StorageService));
  });
  it('preserva URL contextual no retorno de autenticação', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/6a/alunos?origem=inicio');
    expect(TestBed.inject(Router).url).toContain('/login?retorno=');
    expect(safeReturn('/turmas/6a/alunos?origem=inicio')).toBe('/turmas/6a/alunos?origem=inicio');
  });
  it('permite ao professor acessar todas as turmas e gerenciar por URL direta', async () => {
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/7a/aulas');
    expect(TestBed.inject(Router).url).toBe('/turmas/7a/aulas');
    await harness.navigateByUrl('/turmas/6a/gerenciar');
    expect(TestBed.inject(Router).url).toBe('/turmas/6a/gerenciar');
    expect(safeReturn('/turmas/6a/gerenciar')).toBe('/turmas/6a/gerenciar');
  });
  it('professor arquiva turma sem perder a consulta aos registros', async () => {
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/7a/gerenciar');
    expect(TestBed.inject(Router).url).toBe('/turmas/7a/gerenciar');
    const classes = TestBed.inject(ClassesStore);
    await classes.save({ ...classes.require('7a'), ativa: false });
    await harness.navigateByUrl('/turmas/7a/aulas');
    expect(harness.routeNativeElement?.textContent).not.toContain('Registrar aula');
    expect(harness.routeNativeElement?.querySelector('a[data-tooltip="Abrir registro"]')).not.toBeNull();
  });
  it('confirma descarte antes de trocar abas e mantém o rascunho ao cancelar', async () => {
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turmas/6a/aulas/nova');
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('input[type=date]')!;
    input.value = '2026-11-07';
    input.dispatchEvent(new Event('input'));
    const confirm = vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockResolvedValue(false);
    await harness.navigateByUrl('/turmas/6a/alunos');
    expect(TestBed.inject(Router).url).toBe('/turmas/6a/aulas/nova');
    expect(confirm).toHaveBeenCalled();
    confirm.mockResolvedValue(true);
    await harness.navigateByUrl('/turmas/6a/alunos');
    expect(TestBed.inject(Router).url).toBe('/turmas/6a/alunos');
    confirm.mockRestore();
  });
});
