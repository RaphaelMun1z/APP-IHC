import { FieldError } from '../../shared/ui/field-error';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturn } from '../../core/auth/auth.guards';
import { Feedback } from '../../shared/ui/feedback';
import { Modal } from '../../shared/ui/modal';
import { errorMessage } from '../../shared/utils/errors';

@Component({
  selector: 'app-login',
  imports: [FieldError, ReactiveFormsModule, Feedback, Modal],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: [this.auth.rememberedUsername(), Validators.required],
    password: ['', Validators.required],
    remember: true,
  });
  readonly demoAccess = this.auth.demoAccess;
  readonly message = signal(this.auth.error());
  readonly help = signal<{ title: string; description: string } | null>(null);
  fillDemo(coordinator = false): void {
    const credentials = this.auth.demoCredentials(coordinator);
    if (credentials) this.form.patchValue(credentials);
    this.message.set('');
  }
  rememberChanged(): void {
    if (!this.form.controls.remember.value) this.auth.forgetUsername();
  }
  showHelp(kind: 'forgot' | 'google' | 'signup'): void {
    const messages = {
      forgot: {
        title: 'Esqueceu a senha?',
        description:
          'A recuperação de senha ainda não está disponível. Use as credenciais de demonstração do IPB para entrar.',
      },
      google: {
        title: 'Continuar com Google',
        description:
          'O acesso com Google ainda não está disponível. Entre com seu usuário e senha do IPB.',
      },
      signup: {
        title: 'Criar uma conta',
        description:
          'O cadastro ainda não está disponível. Use sua conta de demonstração do IPB.',
      },
    };
    this.help.set(messages[kind]);
  }
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Informe seu usuário e senha.');
      return;
    }
    try {
      const { username, password, remember } = this.form.getRawValue();
      await this.auth.login(username, password, remember);
      this.form.controls.password.reset();
      void this.router.navigateByUrl(safeReturn(this.route.snapshot.queryParamMap.get('retorno')));
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
}
