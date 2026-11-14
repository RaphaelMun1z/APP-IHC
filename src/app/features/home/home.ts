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
      path: '/registro-aula',
      icon: 'menu_book',
      title: 'Registrar aula',
      description: 'Conteúdos e lições da turma',
    },
    {
      path: '/presencas',
      icon: 'event_available',
      title: 'Frequência',
      description: 'Presenças e faltas dos alunos',
    },
    {
      path: '/avaliacao',
      icon: 'fact_check',
      title: 'Avaliação',
      description: 'Desenvolvimento de cada aluno',
    },
    {
      path: '/historico',
      icon: 'history',
      title: 'Histórico',
      description: 'Registros anteriores',
    },
  ];
}
