import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { StorageService } from '../../core/data/storage.service';
import { storageKeys } from '../../core/data/storage-keys';
import { courses, defaultClasses, students, teachers } from '../../core/data/catalog';
import {
  isAssessments,
  isAttendance,
  isClasses,
  isLessons,
  normalizeAttendance,
} from '../../core/data/validators';
import type { AssessmentData, AttendanceData, Lesson, SchoolClass } from '../../core/models/domain';
import { weekdays } from '../../shared/utils/dates';

@Injectable({ providedIn: 'root' })
export class ClassesStore {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly all = this.storage.collection<readonly SchoolClass[]>(
    storageKeys.classes,
    defaultClasses,
    isClasses,
  );
  readonly accessible = computed(() =>
    this.all().filter(
      (group) => this.auth.isCoordinator() || group.professorId === this.auth.user()?.id,
    ),
  );
  readonly active = computed(() => this.accessible().filter((group) => group.ativa));
  readonly students = students;
  readonly courses = courses;
  readonly teachers = teachers;
  get(id: string): SchoolClass | undefined {
    return this.accessible().find((group) => group.id === id);
  }
  require(id: string, active = false): SchoolClass {
    const group = this.get(id);
    if (!group) throw new Error('Turma não disponível para este perfil.');
    if (active && !group.ativa) throw new Error('Esta turma está arquivada.');
    return group;
  }
  roster(id: string) {
    const group = this.get(id);
    return students.filter((student) => group?.alunoIds.includes(student.id));
  }
  course(id: string) {
    return courses.find((course) => course.id === id);
  }
  module(courseId: string, moduleId: string) {
    return this.course(courseId)?.modulos.find((module) => module.id === moduleId);
  }
  schedule(group: SchoolClass): string {
    return `${group.dias.map((day) => weekdays[day]).join(' e ')} · ${group.inicio}–${group.fim}`;
  }
  save(input: SchoolClass): SchoolClass {
    this.requireCoordinator();
    if (
      !input.nome.trim() ||
      input.nome.trim().length > 60 ||
      !this.module(input.cursoId, input.moduloId) ||
      !teachers.some((teacher) => teacher.id === input.professorId)
    )
      throw new Error('Preencha os dados da turma.');
    if (
      !input.dias.length ||
      input.dias.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      !/^\d{2}:\d{2}$/.test(input.inicio) ||
      !/^\d{2}:\d{2}$/.test(input.fim) ||
      input.fim <= input.inicio
    )
      throw new Error('Escolha os dias e um horário final posterior ao inicial.');
    if (
      !input.alunoIds.length ||
      input.alunoIds.some((id) => !students.some((student) => student.id === id))
    )
      throw new Error('Selecione pelo menos um aluno válido.');
    if (input.id && !this.all().some((group) => group.id === input.id))
      throw new Error('Turma não encontrada.');
    if (
      this.all().some(
        (group) =>
          group.id !== input.id &&
          group.nome.toLocaleLowerCase('pt-BR') === input.nome.trim().toLocaleLowerCase('pt-BR'),
      )
    )
      throw new Error('Já existe uma turma com esse nome.');
    const saved = {
      ...input,
      nome: input.nome.trim(),
      id: input.id || crypto.randomUUID(),
      dias: [...new Set(input.dias)],
      alunoIds: [...new Set(input.alunoIds)],
    };
    this.storage.write(storageKeys.classes, [
      ...this.all().filter((group) => group.id !== saved.id),
      saved,
    ]);
    return saved;
  }
  delete(ids: readonly string[]): void {
    this.requireCoordinator();
    if (!ids.length || ids.some((id) => !this.get(id))) throw new Error('Turma não encontrada.');
    const lessons = this.storage.read<readonly Lesson[]>(storageKeys.lessons, [], isLessons);
    const attendance = this.storage.read<AttendanceData>(
      storageKeys.attendance,
      {},
      isAttendance,
      normalizeAttendance,
    );
    const assessments = this.storage.read<AssessmentData>(
      storageKeys.assessments,
      {},
      isAssessments,
    );
    this.storage.writeMany([
      [storageKeys.classes, this.all().filter((group) => !ids.includes(group.id))],
      [storageKeys.lessons, lessons.filter((lesson) => !ids.includes(lesson.turmaId))],
      [
        storageKeys.attendance,
        Object.fromEntries(Object.entries(attendance).filter(([id]) => !ids.includes(id))),
      ],
      [
        storageKeys.assessments,
        Object.fromEntries(Object.entries(assessments).filter(([id]) => !ids.includes(id))),
      ],
    ]);
  }
  private requireCoordinator(): void {
    if (!this.auth.isCoordinator()) throw new Error('Acesso exclusivo da coordenação.');
  }
}
