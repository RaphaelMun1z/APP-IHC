import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassesStore } from '../classes/classes.store';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly classes = inject(ClassesStore);
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
      title: 'Auditoria',
      description: 'Consulta de registros pedagógicos',
    },
  ];
}
