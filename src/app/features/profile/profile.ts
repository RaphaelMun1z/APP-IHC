import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DataState } from '../../core/api/data-state';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <main class="app-page profile-page">
      <section class="surface profile-card" aria-labelledby="profile-name">
        <div class="profile-content">
          <header class="profile-identity">
            <span class="profile-avatar" aria-hidden="true">{{ initials() }}</span>
            <div>
              <h2 id="profile-name">{{ auth.user()?.nome }}</h2>
              <p>{{ role() }}</p>
            </div>
          </header>

          <dl class="profile-details">
            <div>
              <dt>Nome</dt>
              <dd>{{ auth.user()?.nome }}</dd>
            </div>
            <div>
              <dt>Perfil de acesso</dt>
              <dd>{{ role() }}</dd>
            </div>
            <div>
              <dt>CPF</dt>
              <dd>{{ person()?.cpf || 'Não informado' }}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{{ person()?.email || 'Não informado' }}</dd>
            </div>
            @if (auth.user()?.perfil === 'professor') {
              <div><dt>Telefone</dt><dd>{{ phone() || 'Não informado' }}</dd></div>
            }
            <div>
              <dt>Sessão</dt>
              <dd><span class="profile-session">Ativa</span></dd>
            </div>
          </dl>

          @if (mockMode) {
            <p class="profile-note">Conta demonstrativa. Os registros ficam neste navegador.</p>
          }

          <a class="app-button primary profile-classes-link" routerLink="/turmas"
            >Ir para turmas</a
          >
        </div>
      </section>
    </main>
  `,
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  readonly auth = inject(AuthService);
  private readonly catalog = inject(DataState).catalog;
  readonly role = computed(() => this.auth.user()?.perfil === 'coordenacao' ? 'Coordenação pedagógica' : 'Professor');
  readonly teacher = computed(() => this.catalog().professores.find(({ id }) => id === this.auth.user()?.id));
  readonly person = computed(() => this.teacher() ?? this.catalog().coordenadores?.find(({ id }) => id === this.auth.user()?.id));
  readonly phone = computed(() => this.teacher()?.telefone);
  readonly mockMode = !!this.auth.demoAccess;
  readonly initials = computed(() =>
    (this.auth.user()?.nome ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join(''),
  );
}
