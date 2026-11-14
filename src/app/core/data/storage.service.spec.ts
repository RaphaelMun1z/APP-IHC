import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service';
import { isClasses, isAttendance, normalizeAttendance } from './validators';
import { defaultClasses } from './catalog';
import { ClassesStore } from '../../features/classes/classes.store';
import { AuthService } from '../auth/auth.service';
import { storageKeys } from './storage-keys';
import type { AttendanceData } from '../models/domain';

describe('Persistência local', () => {
  let storage: StorageService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    storage = TestBed.inject(StorageService);
  });
  afterEach(() => vi.restoreAllMocks());
  it('mantém dados existentes ao inicializar a demonstração', () => {
    storage.write('classes', []);
    storage.initialize('classes', defaultClasses);
    expect(storage.read('classes', defaultClasses, isClasses)).toEqual([]);
  });
  it('preserva conteúdo corrompido e bloqueia sua sobrescrita', () => {
    localStorage.setItem('classes', '{broken');
    expect(storage.read('classes', defaultClasses, isClasses)).toEqual(defaultClasses);
    expect(() => storage.write('classes', [])).toThrow('dados locais inválidos');
    expect(localStorage.getItem('classes')).toBe('{broken');
    expect(Object.values(storage.errors())).toHaveLength(1);
  });
  it('rejeita registros com estrutura interna inválida', () => {
    localStorage.setItem('classes', JSON.stringify([{ id: '6a', alunoIds: 'invalid' }]));
    expect(storage.read('classes', [], isClasses)).toEqual([]);
    expect(Object.values(storage.errors())).toHaveLength(1);
  });
  it('lê frequência no formato anterior sem descartá-la', () => {
    localStorage.setItem(
      'attendance',
      JSON.stringify({ '2026-11-09': { 'aluno-01': 'presente' } }),
    );
    expect(
      storage.read<AttendanceData>('attendance', {}, isAttendance, normalizeAttendance),
    ).toEqual({ '6a': { '2026-11-09': { 'aluno-01': 'presente' } } });
  });
  it('restaura as gravações anteriores quando uma operação composta falha', () => {
    localStorage.setItem('one', '[1]');
    localStorage.setItem('two', '[2]');
    const original = localStorage.setItem.bind(localStorage);
    let failed = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key === 'two' && !failed) {
        failed = true;
        throw new Error('quota');
      }
      original(key, value);
    });
    expect(() =>
      storage.writeMany([
        ['one', [3]],
        ['two', [4]],
      ]),
    ).toThrow('Não foi possível salvar');
    expect(localStorage.getItem('one')).toBe('[1]');
    expect(localStorage.getItem('two')).toBe('[2]');
    expect(storage.revision()).toBe(0);
  });
  it('apresenta falhas de acesso ao armazenamento', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storage.read('classes', [], isClasses)).toEqual([]);
    expect(Object.values(storage.errors())[0]).toContain('blocked');
  });
  it('expõe falha de restauração e bloqueia gravações seguintes', () => {
    localStorage.setItem('one', '[1]');
    localStorage.setItem('two', '[2]');
    const original = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key === 'two' || (key === 'one' && value === '[1]')) throw new Error('blocked');
      original(key, value);
    });
    expect(() =>
      storage.writeMany([
        ['one', [3]],
        ['two', [4]],
      ]),
    ).toThrow('Não foi possível salvar');
    expect(storage.errors()['rollback']).toContain('Não foi possível restaurar');
    expect(() => storage.write('three', [])).toThrow('dados locais inválidos');
  });
  it('exibe o erro e mantém estados derivados puros ao ler uma turma corrompida', () => {
    localStorage.setItem(storageKeys.classes, '{corrompido');
    TestBed.inject(AuthService).login('professor', 'ipb123', false);
    expect(TestBed.inject(ClassesStore).active()).toHaveLength(2);
    expect(Object.values(storage.errors())[0]).toContain('dados originais foram preservados');
  });
});
