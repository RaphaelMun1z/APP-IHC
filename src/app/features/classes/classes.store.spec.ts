import { provideMockApi } from '../../core/api/api-test.providers';
import { BootstrapService } from '../../core/api/bootstrap.service';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { StorageService } from '../../core/data/storage.service';
import { initializeDemoData } from '../../core/data/demo-data';
import { storageKeys } from '../../core/data/storage-keys';
import type { LessonInput, SchoolClass } from '../../core/models/domain';
import { ClassesStore } from './classes.store';
import { LessonsStore } from '../lessons/lessons.store';
import { AttendanceStore } from '../attendance/attendance.store';
import { AssessmentsStore } from '../assessments/assessments.store';
import { HistoryStore } from '../history/history.store';
import { localDate } from '../../shared/utils/dates';

describe('Regras pedagógicas e acesso do professor', async () => {
  let auth: AuthService;
  let classes: ClassesStore;
  let lessons: LessonsStore;
  let attendance: AttendanceStore;
  let assessments: AssessmentsStore;
  const lesson = (): LessonInput => ({
    turmaId: '6a',
    data: localDate(),
    cursoId: 'formacao',
    moduloId: 'identidade',
    tipo: 'regular',
    licoes: ['Quem sou eu'],
    notas: '',
  });
  const newClass = (): SchoolClass => ({
    id: '',
    nome: '8º ano A',
    professorId: 'professor-01',
    cursoId: 'formacao',
    moduloId: 'identidade',
    dias: [1, 3],
    inicio: '08:00',
    fim: '08:50',
    ativa: true,
    alunoIds: ['aluno-01'],
  });
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    initializeDemoData(TestBed.inject(StorageService));
    auth = TestBed.inject(AuthService);
    classes = TestBed.inject(ClassesStore);
    lessons = TestBed.inject(LessonsStore);
    attendance = TestBed.inject(AttendanceStore);
    assessments = TestBed.inject(AssessmentsStore);
    await auth.login('professor', 'ipb123', false);
    await firstValueFrom(TestBed.inject(BootstrapService).load());
  });
  it('disponibiliza todas as turmas e registros ao único perfil de professor', async () => {
    expect(classes.active()).toHaveLength(4);
    expect(lessons.records()).toHaveLength(4);
    expect(auth.user()?.perfil).toBe('professor');
  });
  it('aceita somente credenciais do perfil Professor', async () => {
    await expect(auth.login('coordenacao', 'ipb123', false)).rejects.toThrow(
      'Usuário ou senha incorretos.',
    );
    expect(auth.user()?.perfil).toBe('professor');
  });
  it('mantém senha fora dos armazenamentos e encerra a sessão', async () => {
    expect(sessionStorage.getItem(storageKeys.session)).not.toContain('ipb123');
    expect(localStorage.getItem(storageKeys.username)).toBeNull();
    await auth.logout();
    expect(auth.user()).toBeNull();
    expect(classes.active()).toHaveLength(0);
  });
  it('permite ao professor salvar registros em qualquer turma', async () => {
    const otherLesson = lessons.records().find((item) => item.turmaId === '7a')!;
    await lessons.save({ ...otherLesson, notas: 'Registro atualizado pelo professor' });
    expect(lessons.records().find((item) => item.id === otherLesson.id)?.notas).toBe(
      'Registro atualizado pelo professor',
    );
    const student = classes.roster('7a')[0];
    await attendance.saveMonth('7a', { [localDate()]: { [student.id]: 'presente' } });
    expect(attendance.records()['7a'][localDate()][student.id]).toBe('presente');
    await assessments.save('demo-aula-7a', assessments.roster('demo-aula-7a'));
    expect(assessments.records()['demo-aula-7a']).toBeDefined();
  });
  it('permite ao professor criar e excluir turmas', async () => {
    const created = await classes.save(newClass());
    expect(classes.get(created.id)).toEqual(created);
    await classes.delete([created.id]);
    expect(classes.get(created.id)).toBeUndefined();
  });
  it('fixa turmas na ordem escolhida e remove fixações ao excluir uma turma', async () => {
    await classes.togglePinned('7a');
    await classes.togglePinned('6a');
    expect(classes.pinned().map((group) => group.id)).toEqual(['7a', '6a']);
    expect(localStorage.getItem(storageKeys.pinnedClasses)).toBe('["7a","6a"]');

    await classes.togglePinned('7a');
    expect(classes.pinned().map((group) => group.id)).toEqual(['6a']);
    await classes.delete(['6a']);
    expect(classes.pinned()).toEqual([]);
    expect(localStorage.getItem(storageKeys.pinnedClasses)).toBe('[]');
  });
  it('cadastra um aluno e persiste sua matrícula apenas na turma escolhida', async () => {
    const classOrder = classes.accessible().map((group) => group.id);
    const otherGroup = classes.get('6b');
    const student = await classes.addStudent('6a', '  Beatriz Souza  ');
    expect(student.nome).toBe('Beatriz Souza');
    expect(classes.roster('6a')).toContainEqual(student);
    expect(classes.get('6a')?.alunoIds).toHaveLength(16);
    expect(classes.get('6b')).toEqual(otherGroup);
    expect(classes.accessible().map((group) => group.id)).toEqual(classOrder);
    expect(assessments.roster('demo-aula-6a').some((item) => item.id === student.id)).toBe(true);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    await firstValueFrom(TestBed.inject(AuthService).restore());
    await firstValueFrom(TestBed.inject(BootstrapService).load());
    expect(TestBed.inject(ClassesStore).roster('6a')).toContainEqual(student);
  });
  it('valida o nome e o estado da turma antes de cadastrar um aluno', async () => {
    await expect(classes.addStudent('6a', '   ')).rejects.toThrow('Informe um nome');
    await expect(classes.addStudent('6a', 'a'.repeat(101))).rejects.toThrow('100');
    const student = await classes.addStudent('7a', 'Beatriz Souza');
    expect(classes.roster('7a')).toContainEqual(student);
    expect(classes.students).toHaveLength(16);
    await classes.save({ ...classes.require('6a'), ativa: false });
    await expect(classes.addStudent('6a', 'Beatriz Souza')).rejects.toThrow('arquivada');
    expect(classes.students).toHaveLength(16);
  });
  it('permite editar alunos das próprias turmas e persiste o nome nas listas relacionadas', async () => {
    const id = 'aluno-01';
    await classes.renameStudent('6a', id, '  Ana Clara Santos Silva  ');
    expect(classes.roster('6a').find((student) => student.id === id)?.nome).toBe(
      'Ana Clara Santos Silva',
    );
    expect(assessments.roster('demo-aula-6a').find((student) => student.id === id)?.nome).toBe(
      'Ana Clara Santos Silva',
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    await firstValueFrom(TestBed.inject(AuthService).restore());
    await firstValueFrom(TestBed.inject(BootstrapService).load());
    expect(
      TestBed.inject(ClassesStore)
        .roster('6a')
        .find((student) => student.id === id)?.nome,
    ).toBe('Ana Clara Santos Silva');
  });
  it('valida nome, matrícula e acesso ao editar ou excluir alunos', async () => {
    await expect(classes.renameStudent('6a', 'aluno-01', '   ')).rejects.toThrow('Informe um nome');
    await expect(classes.renameStudent('6a', 'aluno-01', 'a'.repeat(101))).rejects.toThrow('100');
    const otherStudentId = classes.roster('7a')[0].id;
    await classes.renameStudent('7a', otherStudentId, 'Ana');
    expect(classes.roster('7a').find((student) => student.id === otherStudentId)?.nome).toBe('Ana');
    await classes.removeStudent('7a', otherStudentId);
    expect(classes.roster('7a').some((student) => student.id === otherStudentId)).toBe(false);
    await expect(classes.renameStudent('6a', 'inexistente', 'Ana')).rejects.toThrow(
      'não matriculado',
    );
    await expect(classes.removeStudent('6a', 'inexistente')).rejects.toThrow('não matriculado');
    await classes.removeStudent('6a', 'aluno-01');
    await expect(classes.renameStudent('6a', 'aluno-01', 'Ana')).rejects.toThrow('não matriculado');
  });
  it('exclui apenas a matrícula escolhida e preserva os registros históricos e as outras turmas', async () => {
    const otherGroup = classes.get('6b');
    const previousAttendance = localStorage.getItem(storageKeys.attendance);
    const previousAssessments = localStorage.getItem(storageKeys.lessonAssessments);
    await classes.removeStudent('6a', 'aluno-01');
    expect(classes.roster('6a').some((student) => student.id === 'aluno-01')).toBe(false);
    expect(classes.get('6a')?.alunoIds).toHaveLength(14);
    expect(classes.get('6b')).toEqual(otherGroup);
    expect(classes.students.some((student) => student.id === 'aluno-01')).toBe(true);
    expect(localStorage.getItem(storageKeys.attendance)).toBe(previousAttendance);
    expect(localStorage.getItem(storageKeys.lessonAssessments)).toBe(previousAssessments);
  });
  it('preserva o último aluno e bloqueia edição e exclusão em turmas arquivadas', async () => {
    const group = classes.require('6a');
    for (const id of group.alunoIds.slice(1)) await classes.removeStudent('6a', id);
    await expect(classes.removeStudent('6a', group.alunoIds[0])).rejects.toThrow(
      'pelo menos um aluno',
    );
    await classes.save({ ...classes.require('6a'), ativa: false });
    await expect(classes.renameStudent('6a', 'aluno-01', 'Ana')).rejects.toThrow('arquivada');
    await expect(classes.removeStudent('6a', 'aluno-01')).rejects.toThrow('arquivada');
  });
  it('impede aulas duplicadas e permite editar sem duplicar', async () => {
    const saved = await lessons.save(lesson());
    await expect(lessons.save(lesson())).rejects.toThrow('Já existe uma aula');
    await lessons.save({ ...lesson(), id: saved.id, notas: 'Alterado' });
    expect(lessons.records().filter((item) => item.data === localDate())).toHaveLength(1);
    expect(lessons.records().find((item) => item.id === saved.id)?.notas).toBe('Alterado');
  });
  it('valida datas, conteúdo e tamanho das observações', async () => {
    await expect(lessons.save({ ...lesson(), data: '9999-01-01' })).rejects.toThrow('data válida');
    await expect(lessons.save({ ...lesson(), data: '2026-02-30' })).rejects.toThrow('data válida');
    await expect(lessons.save({ ...lesson(), licoes: ['inexistente'] })).rejects.toThrow('lição');
    await expect(lessons.save({ ...lesson(), notas: 'x'.repeat(601) })).rejects.toThrow('600');
  });
  it('valida nomes duplicados, horário e matrícula da turma', async () => {
    await expect(classes.save({ ...newClass(), nome: ' 6º ANO a ' })).rejects.toThrow('esse nome');
    await expect(classes.save({ ...newClass(), fim: '07:00' })).rejects.toThrow('horário final');
    await expect(classes.save({ ...newClass(), alunoIds: [] })).rejects.toThrow('aluno válido');
    await expect(classes.save({ ...newClass(), dias: [7] })).rejects.toThrow('dias');
  });
  it('arquiva sem perder histórico e bloqueia novas gravações', async () => {
    const group = classes.require('6a');
    await classes.save({ ...group, ativa: false });
    expect(classes.active().some((item) => item.id === '6a')).toBe(false);
    expect(
      TestBed.inject(HistoryStore)
        .records()
        .some((item) => item.turmaId === '6a'),
    ).toBe(true);
    await expect(lessons.save(lesson())).rejects.toThrow('arquivada');
    await expect(attendance.saveMonth('6a', {})).rejects.toThrow('arquivada');
    await expect(assessments.save('demo-aula-6a', [])).rejects.toThrow('arquivada');
  });
  it('exclui em conjunto turma e registros associados, atualizando stores já abertos', async () => {
    const history = TestBed.inject(HistoryStore);
    expect(history.records().filter((item) => item.turmaId === '6a')).toHaveLength(3);
    await classes.delete(['6a']);
    expect(classes.get('6a')).toBeUndefined();
    expect(history.records().some((item) => item.turmaId === '6a')).toBe(false);
    expect(localStorage.getItem(storageKeys.lessons)).not.toContain('demo-aula-6a');
    expect(localStorage.getItem(storageKeys.attendance)).not.toContain('"6a"');
    expect(localStorage.getItem(storageKeys.lessonAssessments)).not.toContain('demo-aula-6a');
  });
  it('salva frequência e avaliação no histórico sem limitar outros registros', async () => {
    const otherAssessment = assessments.records()['demo-aula-7a'];
    await attendance.saveMonth('6a', {
      [localDate()]: { 'aluno-01': 'presente', 'aluno-02': 'falta' },
    });
    await assessments.save('demo-aula-6a', assessments.roster('demo-aula-6a'));
    const history = TestBed.inject(HistoryStore);
    expect(
      history
        .records()
        .find(
          (item) =>
            item.turmaId === '6a' && item.data === localDate() && item.tipo === 'frequencia',
        )?.resumo,
    ).toBe('1 presentes · 1 faltas');
    expect(assessments.records()['demo-aula-7a']).toEqual(otherAssessment);
  });
  it('preserva marcas históricas ao remover um aluno da turma', async () => {
    await attendance.saveMonth('6a', {
      [localDate()]: { 'aluno-01': 'presente', 'aluno-02': 'falta' },
    });
    await assessments.save('demo-aula-6a', assessments.roster('demo-aula-6a'));
    const group = classes.require('6a');
    await classes.save({ ...group, alunoIds: group.alunoIds.filter((id) => id !== 'aluno-02') });
    await attendance.saveMonth('6a', { [localDate()]: { 'aluno-01': 'falta' } });
    await assessments.save('demo-aula-6a', assessments.roster('demo-aula-6a'));
    expect(attendance.records()['6a'][localDate()]['aluno-02']).toBe('falta');
    expect(
      assessments.records()['demo-aula-6a'].alunos.some((student) => student.id === 'aluno-02'),
    ).toBe(true);
  });
});
