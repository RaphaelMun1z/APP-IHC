import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClassesStore } from '../classes/classes.store';
@Component({
  selector: 'app-coordination',
  imports: [FormsModule, RouterLink],
  templateUrl: './coordination.html',
  styleUrl: './coordination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination {
  readonly classes = inject(ClassesStore);
  readonly query = signal('');
  readonly teacher = signal('');
  readonly status = signal('ativas');
  readonly filtered = computed(() =>
    this.classes
      .accessible()
      .filter(
        (group) =>
          group.nome
            .toLocaleLowerCase('pt-BR')
            .includes(this.query().trim().toLocaleLowerCase('pt-BR')) &&
          (!this.teacher() || group.professorId === this.teacher()) &&
          (this.status() === 'todas' || group.ativa === (this.status() === 'ativas')),
      ),
  );
  teacherName(id: string): string {
    return this.classes.teachers.find((teacher) => teacher.id === id)?.nome ?? '—';
  }
}
