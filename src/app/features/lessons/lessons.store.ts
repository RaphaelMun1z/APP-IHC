import { Injectable, computed, inject } from '@angular/core';
import { StorageService } from '../../core/data/storage.service';
import { storageKeys } from '../../core/data/storage-keys';
import { isLessons } from '../../core/data/validators';
import { AuthService } from '../../core/auth/auth.service';
import type { Lesson, LessonInput } from '../../core/models/domain';
import { lessonTypes } from '../../core/models/domain';
import { requirePastDate } from '../../shared/utils/dates';
import { ClassesStore } from '../classes/classes.store';

@Injectable({ providedIn: 'root' })
export class LessonsStore {
  private readonly storage = inject(StorageService);
  private readonly classes = inject(ClassesStore);
  private readonly auth = inject(AuthService);
  private readonly all = this.storage.collection<readonly Lesson[]>(
    storageKeys.lessons,
    [],
    isLessons,
  );
  readonly records = computed(() =>
    this.all().filter((lesson) => this.classes.get(lesson.turmaId)),
  );
  save(input: LessonInput): Lesson {
    this.classes.require(input.turmaId, true);
    const module = this.classes.module(input.cursoId, input.moduloId);
    if (
      !module ||
      !input.licoes.length ||
      input.licoes.some((lesson) => !module.licoes.includes(lesson))
    )
      throw new Error('Selecione o módulo e pelo menos uma lição.');
    requirePastDate(input.data);
    if (!Object.hasOwn(lessonTypes, input.tipo)) throw new Error('Selecione o tipo de aula.');
    if (input.notas.length > 600) throw new Error('As observações devem ter até 600 caracteres.');
    const previous = input.id ? this.all().find((lesson) => lesson.id === input.id) : undefined;
    if (input.id && !previous) throw new Error('Registro não encontrado.');
    if (previous) this.classes.require(previous.turmaId, true);
    if (
      this.all().some(
        (lesson) =>
          lesson.id !== input.id && lesson.turmaId === input.turmaId && lesson.data === input.data,
      )
    )
      throw new Error(
        'Já existe uma aula nesta data para a turma. Abra o registro no Histórico para editá-lo.',
      );
    const user = this.auth.user();
    if (!user) throw new Error('Entre na sua conta para salvar.');
    const saved: Lesson = {
      ...input,
      notas: input.notas.trim(),
      id: previous?.id ?? crypto.randomUUID(),
      professorId: previous?.professorId ?? user.id,
      atualizadoEm: new Date().toISOString(),
    };
    this.storage.write(storageKeys.lessons, [
      ...this.all().filter((lesson) => lesson.id !== saved.id),
      saved,
    ]);
    return saved;
  }
}
