import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassesStore } from '../classes/classes.store';
import { Feedback } from '../../shared/ui/feedback';
@Component({
  selector: 'app-home',
  imports: [RouterLink, Feedback],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly classes = inject(ClassesStore);
  readonly message = signal('');
  async unpin(id: string): Promise<void> {
    try {
      await this.classes.togglePinned(id);
      this.message.set('Turma desfixada da tela inicial.');
    } catch {
      this.message.set('Não foi possível desfixar a turma. Tente novamente.');
    }
  }
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
