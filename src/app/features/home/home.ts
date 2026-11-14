import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly auth = inject(AuthService);
  readonly links = [
    {
      path: '/turmas',
      icon: 'groups',
      title: 'Minhas turmas',
      description: 'Alunos, cursos e horários',
    },
    {
      path: '/historico',
      icon: 'history',
      title: 'Histórico',
      description: 'Registros anteriores',
    },
  ];
}
