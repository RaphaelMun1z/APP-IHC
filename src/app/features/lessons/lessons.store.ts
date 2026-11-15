import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import type { Lesson, LessonInput } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { LessonsApi } from './lessons.api';

@Injectable({ providedIn: 'root' })
export class LessonsStore {
  private readonly state = inject(DataState);
  private readonly classes = inject(ClassesStore);
  private readonly api = inject(LessonsApi);
  private readonly requests = inject(RequestState);
  readonly records = computed(() =>
    this.state.lessons().filter((lesson) => this.classes.get(lesson.turmaId)),
  );
  save(input: LessonInput): Promise<Lesson> {
    const { id, turmaId, data, cursoId, moduloId, tipo, licoes, notas } = input;
    const body = { turmaId, data, cursoId, moduloId, tipo, licoes, notas };
    return this.requests.mutate(
      (id ? this.api.update(id, body) : this.api.create(body)).pipe(
        tap((saved) => {
          this.state.lessons.update((lessons) => [
            ...lessons.filter((lesson) => lesson.id !== saved.id),
            saved,
          ]);
        }),
      ),
    );
  }
}
