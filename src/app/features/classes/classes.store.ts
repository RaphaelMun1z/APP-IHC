import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import type { SchoolClass, Student } from '../../core/models/domain';
import { ClassesApi } from './classes.api';
import type { StudentRequest } from '../../core/api/contracts';
import { teaches } from '../../core/data/academic-records';

@Injectable({ providedIn: 'root' })
export class ClassesStore {
  private readonly auth = inject(AuthService);
  private readonly state = inject(DataState);
  private readonly api = inject(ClassesApi);
  private readonly requests = inject(RequestState);
  readonly accessible = computed(() => (this.auth.user() ? this.state.classes() : []));
  readonly active = computed(() => this.accessible().filter((group) => group.ativa));
  readonly pinned = computed(() =>
    this.state.pins().flatMap((id) => {
      const group = this.get(id);
      return group ? [group] : [];
    }),
  );
  get students() {
    return this.state.students();
  }
  get courses() {
    return this.state.catalog().cursos;
  }
  get teachers() {
    return this.state.catalog().professores;
  }
  get(id: string) {
    return this.accessible().find((group) => group.id === id);
  }
  canTeach(id: string): boolean {
    return teaches(this.get(id), this.auth.user());
  }
  require(id: string, active = false): SchoolClass {
    const group = this.get(id);
    if (!group) throw new Error('Turma não encontrada.');
    if (active && !group.ativa) throw new Error('Esta turma está arquivada.');
    return group;
  }
  roster(id: string) {
    return this.students.filter((student) => this.get(id)?.alunoIds.includes(student.id));
  }
  course(id: string) {
    return this.courses.find((course) => course.id === id);
  }
  module(courseId: string, moduleId: string) {
    return this.course(courseId)?.modulos.find((module) => module.id === moduleId);
  }
  isPinned(id: string): boolean {
    return this.state.pins().includes(id);
  }
  togglePinned(id: string) {
    return this.requests.mutate(
      this.api.pin(id, !this.isPinned(id)).pipe(tap((pins) => this.state.pins.set(pins.turmaIds))),
    );
  }
  private upsert(group: SchoolClass): void {
    this.state.classes.update((groups) => [
      ...groups.filter((item) => item.id !== group.id),
      group,
    ]);
  }
  async addStudent(classId: string, input: string | StudentRequest): Promise<Student> {
    const result = await this.requests.mutate(
      this.api.addStudent(classId, typeof input === 'string' ? { nome: input } : input).pipe(
        tap(({ aluno, turma }) => {
          this.state.students.update((students) => [...students, aluno]);
          this.state.classes.update((groups) =>
            groups.map((group) => (group.id === turma.id ? turma : group)),
          );
        }),
      ),
    );
    return result.aluno;
  }
  async renameStudent(classId: string, studentId: string, name: string): Promise<void> {
    await this.updateStudent(classId, studentId, { nome: name });
  }
  async updateStudent(classId: string, studentId: string, input: StudentRequest): Promise<void> {
    await this.requests.mutate(
      this.api.renameStudent(classId, studentId, input).pipe(
        tap((student) => {
          this.state.students.update((students) =>
            students.map((item) => (item.id === student.id ? student : item)),
          );
        }),
      ),
    );
  }
  assignTeachers(id: string, professorIds: readonly string[]) {
    return this.requests.mutate(this.api.assignTeachers(id, professorIds).pipe(tap((group) => this.upsert(group))));
  }
  async removeStudent(classId: string, studentId: string): Promise<void> {
    await this.requests.mutate(
      this.api.removeStudent(classId, studentId).pipe(
        tap((updated) => {
          this.state.classes.update((groups) =>
            groups.map((group) => (group.id === updated.id ? updated : group)),
          );
        }),
      ),
    );
  }
  save(input: SchoolClass): Promise<SchoolClass> {
    const { id, ...body } = input;
    return this.requests.mutate(
      (id ? this.api.update(id, body) : this.api.create(body)).pipe(
        tap((group) => this.upsert(group)),
      ),
    );
  }
  async delete(ids: readonly string[]): Promise<void> {
    await this.requests.mutate(
      this.api.delete(ids).pipe(
        tap(() => {
          const removedLessons = new Set(
            this.state
              .lessons()
              .filter((lesson) => ids.includes(lesson.turmaId))
              .map((lesson) => lesson.id),
          );
          this.state.classes.update((groups) => groups.filter((group) => !ids.includes(group.id)));
          this.state.pins.update((pins) => pins.filter((id) => !ids.includes(id)));
          this.state.lessons.update((lessons) =>
            lessons.filter((lesson) => !ids.includes(lesson.turmaId)),
          );
          this.state.attendance.update((records) =>
            Object.fromEntries(Object.entries(records).filter(([id]) => !ids.includes(id))),
          );
          this.state.assessments.update((records) =>
            Object.fromEntries(Object.entries(records).filter(([id]) => !removedLessons.has(id))),
          );
          this.state.unlinked.update((records) =>
            records.filter((item) => !ids.includes(item.classId)),
          );
        }),
      ),
    );
  }
}
