import { Injectable, computed, inject } from '@angular/core';
import { MockSession } from './mock-session';
import { StorageService } from '../../data/storage.service';
import { storageKeys } from '../../data/storage-keys';
import { defaultClasses, demoCoordinator, students } from '../../data/catalog';
import { enrollments, teachingAssignments } from '../../data/academic-records';
import { isDate, localDate } from '../../../shared/utils/dates';
import { studentFields } from '../../models/domain';
import type { StudentRequest } from '../contracts';
import { MockCatalogRepository } from './catalog.repository';
import {
  isAssessments,
  isAttendance,
  isClasses,
  isLegacyAssessments,
  isLessons,
  isPinnedClassIds,
  isStudents,
  normalizeAttendance,
} from '../../data/validators';
import type {
  AssessmentData,
  AttendanceData,
  LegacyAssessmentData,
  Lesson,
  SchoolClass,
  Student,
} from '../../models/domain';

@Injectable({ providedIn: 'root' })
export class MockClassesRepository {
  private readonly catalog = inject(MockCatalogRepository);
  private readonly auth = inject(MockSession);
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
  readonly accessible = computed(() =>
    this.auth.user()
      ? this.all().map((group) => ({
          ...group,
          coordenadorId: group.coordenadorId ?? demoCoordinator.id,
          matriculas: enrollments(group),
          leciona: teachingAssignments(group),
        }))
      : [],
  );
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
  private readonly studentRecords = computed(() =>
    this.studentList().map((student) => ({
      ...student,
      coordenadorId: student.coordenadorId ?? demoCoordinator.id,
    })),
  );
  get students(): readonly Student[] {
    return this.studentRecords();
  }
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
  addStudent(classId: string, input: StudentRequest): Student {
    const group = this.require(classId, true);
    const student: Student = {
      ...this.studentData(input),
      id: crypto.randomUUID(),
      coordenadorId: this.catalog.coordinatorForNewRecord(),
    };
    const matriculas = [
      ...enrollments(group),
      {
        alunoId: student.id,
        turmaId: group.id,
        dataMatricula: localDate(),
      },
    ];
    this.storage.writeMany([
      [storageKeys.students, [...this.students, student]],
      [
        storageKeys.classes,
        this.all().map((item) =>
          item.id === classId
            ? { ...group, alunoIds: matriculas.map(({ alunoId }) => alunoId), matriculas }
            : item,
        ),
      ],
    ]);
    return student;
  }
  updateStudent(classId: string, studentId: string, input: StudentRequest): Student {
    const group = this.require(classId, true);
    if (!group.alunoIds.includes(studentId)) throw new Error('Aluno não matriculado nesta turma.');
    const student = this.students.find((item) => item.id === studentId);
    if (!student) throw new Error('Aluno não encontrado.');
    const updated = { ...student, ...this.studentData(input, studentId) };
    this.storage.write(
      storageKeys.students,
      this.students.map((item) => (item.id === studentId ? updated : item)),
    );
    return updated;
  }
  private studentData(input: StudentRequest, id?: string): StudentRequest {
    const nome = input.nome.trim();
    if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
    const values: StudentRequest = { nome };
    for (const key of Object.keys(studentFields) as (keyof typeof studentFields)[]) {
      const raw = input[key];
      if (raw === undefined) continue;
      const value = raw.trim();
      if (value.length > 150) throw new Error(`${studentFields[key]} deve ter até 150 caracteres.`);
      values[key] = value;
    }
    if (values.cpf) {
      values.cpf = values.cpf.replace(/[.\s-]/g, '');
      if (!/^\d{11}$/.test(values.cpf)) throw new Error('Informe um CPF com 11 dígitos.');
      if (this.students.some((student) => student.id !== id && student.cpf === values.cpf))
        throw new Error('Já existe um aluno com esse CPF.');
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      throw new Error('Informe um e-mail válido.');
    if (values.uf) {
      values.uf = values.uf.toUpperCase();
      if (!/^[A-Z]{2}$/.test(values.uf)) throw new Error('Informe a UF com duas letras.');
    }
    if (
      values.dataNascimento &&
      (!isDate(values.dataNascimento) || values.dataNascimento > localDate())
    )
      throw new Error('Informe uma data de nascimento válida, até hoje.');
    return values;
  }
  removeStudent(classId: string, studentId: string): void {
    const group = this.require(classId, true);
    if (!group.alunoIds.includes(studentId)) throw new Error('Aluno não matriculado nesta turma.');
    if (group.alunoIds.length <= 1) throw new Error('A turma deve ter pelo menos um aluno.');
    this.storage.write(
      storageKeys.classes,
      this.all().map((item) =>
        item.id === classId
          ? {
              ...group,
              alunoIds: group.alunoIds.filter((id) => id !== studentId),
              matriculas: enrollments(group).filter(({ alunoId }) => alunoId !== studentId),
            }
          : item,
      ),
    );
  }
  course(id: string) {
    return this.catalog.records().cursos.find((course) => course.id === id);
  }
  module(courseId: string, moduleId: string) {
    return this.course(courseId)?.modulos.find((module) => module.id === moduleId);
  }
  save(input: SchoolClass): SchoolClass {
    const previous = input.id ? this.require(input.id) : undefined;
    const user = this.auth.user();
    const professorId =
      previous?.professorId ?? (user?.perfil === 'professor' ? user.id : input.professorId);
    if (
      !input.nome.trim() ||
      input.nome.trim().length > 60 ||
      !this.module(input.cursoId, input.moduloId) ||
      !this.catalog.records().professores.some((teacher) => teacher.id === professorId)
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
    if (
      [input.faixaEtaria, input.modalidade].some(
        (value) => value !== undefined && (!value.trim() || value.trim().length > 100),
      )
    ) {
      throw new Error('Informe faixa etária e modalidade com até 100 caracteres.');
    }
    for (const alunoId of new Set(input.alunoIds)) {
      if (
        !previous?.alunoIds.includes(alunoId) &&
        this.all().filter((group) => group.alunoIds.includes(alunoId)).length >= 10
      )
        throw new Error('Um aluno pode ter matrícula em até 10 turmas.');
    }
    if (
      this.all().some(
        (group) =>
          group.id !== input.id &&
          group.nome.toLocaleLowerCase('pt-BR') === input.nome.trim().toLocaleLowerCase('pt-BR'),
      )
    )
      throw new Error('Já existe uma turma com esse nome.');
    const id = previous?.id ?? crypto.randomUUID();
    const alunoIds = [...new Set(input.alunoIds)];
    const oldEnrollments = previous ? enrollments(previous) : [];
    const saved: SchoolClass = {
      id,
      nome: input.nome.trim(),
      cursoId: input.cursoId,
      moduloId: input.moduloId,
      professorId,
      inicio: input.inicio,
      fim: input.fim,
      ativa: input.ativa,
      coordenadorId: previous?.coordenadorId ?? this.catalog.coordinatorForNewRecord(),
      faixaEtaria: input.faixaEtaria?.trim() ?? previous?.faixaEtaria,
      modalidade: input.modalidade?.trim() ?? previous?.modalidade,
      dias: [...new Set(input.dias)],
      alunoIds,
      matriculas: alunoIds.map(
        (alunoId) =>
          oldEnrollments.find((row) => row.alunoId === alunoId) ?? {
            alunoId,
            turmaId: id,
            dataMatricula: localDate(),
          },
      ),
      leciona: previous ? teachingAssignments(previous) : [{ professorId, turmaId: id }],
    };
    this.storage.write(storageKeys.classes, [
      ...this.all().filter((group) => group.id !== saved.id),
      saved,
    ]);
    return saved;
  }
  assignTeachers(id: string, professorIds: readonly string[]): SchoolClass {
    this.catalog.requireCoordinator();
    const group = this.require(id);
    const ids = [...new Set(professorIds)];
    if (
      !ids.length ||
      ids.some((id) => !this.catalog.records().professores.some((teacher) => teacher.id === id))
    )
      throw new Error('Vincule pelo menos um professor válido à turma.');
    const updated = {
      ...group,
      professorId: ids.includes(group.professorId) ? group.professorId : ids[0],
      leciona: ids.map((professorId) => ({ professorId, turmaId: id })),
    };
    this.storage.write(
      storageKeys.classes,
      this.all().map((row) => (row.id === id ? updated : row)),
    );
    return updated;
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
