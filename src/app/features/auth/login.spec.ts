import { provideMockApi } from '../../core/api/api-test.providers';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../core/auth/auth.service';
describe('Formulário de login', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideMockApi()],
    });
  });
  it('mostra erro para credenciais inválidas sem criar uma sessão', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({ username: 'professor', password: 'incorreta' });
    await fixture.componentInstance.submit();
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    expect(
      host instanceof HTMLElement && host.querySelector('[role="alert"]')?.textContent,
    ).toContain('Usuário ou senha incorretos');
    expect(TestBed.inject(AuthService).user()).toBeNull();
  });
  it('preenche credenciais públicas e usa controles tipados', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.fillDemo();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      username: 'professor',
      password: 'ipb123',
      remember: true,
    });
  });
});
