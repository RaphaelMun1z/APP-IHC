import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { StorageService } from '../../core/data/storage.service';
import { storageKeys } from '../../core/data/storage-keys';
import { courses, defaultClasses, students, teachers } from '../../core/data/catalog';
import {
  isAssessments,
  isAttendance,
  isClasses,
  isLegacyAssessments,
  isLessons,
  isPinnedClassIds,
  isStudents,
  normalizeAttendance,
} from '../../core/data/validators';
import type {
  AssessmentData,
  AttendanceData,
  LegacyAssessmentData,
  Lesson,
  SchoolClass,
  Student,
} from '../../core/models/domain';
import { weekdays } from '../../shared/utils/dates';

@Injectable({ providedIn: 'root' })
export class ClassesStore {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly all = this.storage.collection<readonly SchoolClass[]>(
    storageKeys.classes,
    defaultClasses,
    isClasses,
  );
  private readonly pinnedIds = this.storage.collection<readonly string[]>(
    storageKeys.pinnedClasses,
    [],
    isPinnedClassIds,
  );
  readonly accessible = computed(() => (this.auth.user() ? this.all() : []));
  readonly active = computed(() => this.accessible().filter((group) => group.ativa));
  readonly pinned = computed(() => {
    const groups = this.accessible();
    return this.pinnedIds().flatMap((id) => {
      const group = groups.find((item) => item.id === id);
      return group ? [group] : [];
    });
  });
  private readonly studentList = this.storage.collection<readonly Student[]>(
    storageKeys.students,
    students,
    isStudents,
  );
  get students(): readonly Student[] {
    return this.studentList();
  }
  readonly courses = courses;
  readonly teachers = teachers;
  get(id: string): SchoolClass | undefined {
    return this.accessible().find((group) => group.id === id);
  }
  isPinned(id: string): boolean {
    return this.pinnedIds().includes(id);
  }
  togglePinned(id: string): void {
    this.require(id);
    const pinned = this.pinnedIds();
    this.storage.write(
      storageKeys.pinnedClasses,
      pinned.includes(id) ? pinned.filter((item) => item !== id) : [...pinned, id],
    );
  }
  require(id: string, active = false): SchoolClass {
    const group = this.get(id);
    if (!group) throw new Error('Turma não encontrada.');
    if (active && !group.ativa) throw new Error('Esta turma está arquivada.');
    return group;
  }
  roster(id: string) {
    const group = this.get(id);
    return this.students.filter((student) => group?.alunoIds.includes(student.id));
  }
  addStudent(classId: string, name: string): Student {
    this.require(classId, true);
    const nome = name.trim();
    if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
    const student: Student = { id: crypto.randomUUID(), nome };
    this.storage.writeMany([
      [storageKeys.students, [...this.students, student]],
      [
        storageKeys.classes,
        this.all().map((item) =>
          item.id === classId ? { ...item, alunoIds: [...item.alunoIds, student.id] } : item,
        ),
      ],
    ]);
    return student;
  }
  renameStudent(classId: string, studentId: string, name: string): void {
    const group = this.require(classId, true);
    if (!group.alunoIds.includes(studentId)) throw new Error('Aluno não matriculado nesta turma.');
    const student = this.students.find((item) => item.id === studentId);
    if (!student) throw new Error('Aluno não encontrado.');
    const nome = name.trim();
    if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
    this.storage.write(
      storageKeys.students,
      this.students.map((item) => (item.id === studentId ? { ...item, nome } : item)),
    );
  }
  removeStudent(classId: string, studentId: string): void {
    const group = this.require(classId, true);
    if (!group.alunoIds.includes(studentId)) throw new Error('Aluno não matriculado nesta turma.');
    if (group.alunoIds.length <= 1) throw new Error('A turma deve ter pelo menos um aluno.');
    this.storage.write(
      storageKeys.classes,
      this.all().map((item) =>
        item.id === classId
          ? { ...item, alunoIds: item.alunoIds.filter((id) => id !== studentId) }
          : item,
      ),
    );
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
      input.alunoIds.some((id) => !this.students.some((student) => student.id === id))
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
    if (!ids.length || ids.some((id) => !this.get(id))) throw new Error('Turma não encontrada.');
    const lessons = this.storage.read<readonly Lesson[]>(storageKeys.lessons, [], isLessons);
    const attendance = this.storage.read<AttendanceData>(
      storageKeys.attendance,
      {},
      isAttendance,
      normalizeAttendance,
    );
    const assessments = this.storage.read<LegacyAssessmentData>(
      storageKeys.assessments,
      {},
      isLegacyAssessments,
    );
    const lessonAssessments = this.storage.read<AssessmentData>(
      storageKeys.lessonAssessments,
      {},
      isAssessments,
    );
    const deletedLessons = new Set(
      lessons.filter((lesson) => ids.includes(lesson.turmaId)).map((lesson) => lesson.id),
    );
    this.storage.writeMany([
      [storageKeys.classes, this.all().filter((group) => !ids.includes(group.id))],
      [storageKeys.pinnedClasses, this.pinnedIds().filter((id) => !ids.includes(id))],
      [storageKeys.lessons, lessons.filter((lesson) => !ids.includes(lesson.turmaId))],
      [
        storageKeys.attendance,
        Object.fromEntries(Object.entries(attendance).filter(([id]) => !ids.includes(id))),
      ],
      [
        storageKeys.assessments,
        Object.fromEntries(Object.entries(assessments).filter(([id]) => !ids.includes(id))),
      ],
      [
        storageKeys.lessonAssessments,
        Object.fromEntries(
          Object.entries(lessonAssessments).filter(([lessonId]) => !deletedLessons.has(lessonId)),
        ),
      ],
    ]);
  }
}
