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

describe('Regras pedagógicas e perfis', () => {
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
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    initializeDemoData(TestBed.inject(StorageService));
    auth = TestBed.inject(AuthService);
    classes = TestBed.inject(ClassesStore);
    lessons = TestBed.inject(LessonsStore);
    attendance = TestBed.inject(AttendanceStore);
    assessments = TestBed.inject(AssessmentsStore);
    auth.login('professor', 'ipb123', false);
  });
  it('limita turmas e registros ao professor e atualiza sinais ao trocar perfil', () => {
    expect(classes.active().map((group) => group.id)).toEqual(['6a', '6b']);
    expect(lessons.records()).toHaveLength(2);
    auth.login('coordenacao', 'ipb123', false);
    expect(classes.active()).toHaveLength(4);
    expect(lessons.records()).toHaveLength(4);
  });
  it('mantém senha fora dos armazenamentos e encerra a sessão', () => {
    expect(sessionStorage.getItem(storageKeys.session)).not.toContain('ipb123');
    expect(localStorage.getItem(storageKeys.username)).toBeNull();
    auth.logout();
    expect(auth.user()).toBeNull();
    expect(classes.active()).toHaveLength(0);
  });
  it('nega gravação em turmas de outro professor', () => {
    expect(() => lessons.save({ ...lesson(), turmaId: '7a' })).toThrow('não disponível');
    expect(() => attendance.saveMonth('7a', {})).toThrow('não disponível');
    expect(() => assessments.save('7a', localDate(), [])).toThrow('não disponível');
  });
  it('reserva criação e exclusão de turmas à coordenação', () => {
    expect(() => classes.save(newClass())).toThrow('exclusivo');
    expect(() => classes.delete(['6a'])).toThrow('exclusivo');
  });
  it('impede aulas duplicadas e permite editar sem duplicar', () => {
    const saved = lessons.save(lesson());
    expect(() => lessons.save(lesson())).toThrow('Já existe uma aula');
    lessons.save({ ...lesson(), id: saved.id, notas: 'Alterado' });
    expect(lessons.records().filter((item) => item.data === localDate())).toHaveLength(1);
    expect(lessons.records().find((item) => item.id === saved.id)?.notas).toBe('Alterado');
  });
  it('valida datas, conteúdo e tamanho das observações', () => {
    expect(() => lessons.save({ ...lesson(), data: '9999-01-01' })).toThrow('data válida');
    expect(() => lessons.save({ ...lesson(), data: '2026-02-30' })).toThrow('data válida');
    expect(() => lessons.save({ ...lesson(), licoes: ['inexistente'] })).toThrow('lição');
    expect(() => lessons.save({ ...lesson(), notas: 'x'.repeat(601) })).toThrow('600');
  });
  it('valida nomes duplicados, horário e matrícula da turma', () => {
    auth.login('coordenacao', 'ipb123', false);
    expect(() => classes.save({ ...newClass(), nome: ' 6º ANO a ' })).toThrow('esse nome');
    expect(() => classes.save({ ...newClass(), fim: '07:00' })).toThrow('horário final');
    expect(() => classes.save({ ...newClass(), alunoIds: [] })).toThrow('aluno válido');
    expect(() => classes.save({ ...newClass(), dias: [7] })).toThrow('dias');
  });
  it('arquiva sem perder histórico e bloqueia novas gravações', () => {
    auth.login('coordenacao', 'ipb123', false);
    const group = classes.require('6a');
    classes.save({ ...group, ativa: false });
    expect(classes.active().some((item) => item.id === '6a')).toBe(false);
    expect(
      TestBed.inject(HistoryStore)
        .records()
        .some((item) => item.turmaId === '6a'),
    ).toBe(true);
    expect(() => lessons.save(lesson())).toThrow('arquivada');
    expect(() => attendance.saveMonth('6a', {})).toThrow('arquivada');
    expect(() => assessments.save('6a', localDate(), [])).toThrow('arquivada');
  });
  it('exclui em conjunto turma e registros associados, atualizando stores já abertos', () => {
    auth.login('coordenacao', 'ipb123', false);
    const history = TestBed.inject(HistoryStore);
    expect(history.records().filter((item) => item.turmaId === '6a')).toHaveLength(3);
    classes.delete(['6a']);
    expect(classes.get('6a')).toBeUndefined();
    expect(history.records().some((item) => item.turmaId === '6a')).toBe(false);
    expect(localStorage.getItem(storageKeys.lessons)).not.toContain('demo-aula-6a');
    expect(localStorage.getItem(storageKeys.attendance)).not.toContain('"6a"');
  });
  it('salva frequência e avaliação no histórico, preservando outros perfis', () => {
    const before = localStorage.getItem(storageKeys.assessments);
    attendance.saveMonth('6a', { [localDate()]: { 'aluno-01': 'presente', 'aluno-02': 'falta' } });
    assessments.save('6a', localDate(), assessments.roster('6a', localDate()));
    const history = TestBed.inject(HistoryStore);
    expect(
      history
        .records()
        .find(
          (item) =>
            item.turmaId === '6a' && item.data === localDate() && item.tipo === 'frequencia',
        )?.resumo,
    ).toBe('1 presentes · 1 faltas');
    auth.login('coordenacao', 'ipb123', false);
    expect(assessments.records()['7a']).toEqual(JSON.parse(before ?? '{}')['7a']);
  });
  it('preserva marcas históricas ao remover um aluno da turma', () => {
    attendance.saveMonth('6a', { [localDate()]: { 'aluno-01': 'presente', 'aluno-02': 'falta' } });
    assessments.save('6a', localDate(), assessments.roster('6a', localDate()));
    auth.login('coordenacao', 'ipb123', false);
    const group = classes.require('6a');
    classes.save({ ...group, alunoIds: group.alunoIds.filter((id) => id !== 'aluno-02') });
    attendance.saveMonth('6a', { [localDate()]: { 'aluno-01': 'falta' } });
    assessments.save('6a', localDate(), assessments.roster('6a', localDate()));
    expect(attendance.records()['6a'][localDate()]['aluno-02']).toBe('falta');
    expect(
      assessments.records()['6a'][localDate()].alunos.some((student) => student.id === 'aluno-02'),
    ).toBe(true);
  });
});
