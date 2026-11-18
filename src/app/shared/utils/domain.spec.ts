import { describe, expect, it } from 'vitest';
import { isDate, localDate } from './dates';
import { attendanceColumns, nextAttendance } from '../../features/attendance/attendance.store';
import { nextAssessment } from '../../features/assessments/assessments.store';
import { safeReturn } from '../../core/auth/auth.guards';
import { filterHistory } from '../../features/history/history.store';
describe('Datas, navegação e estados', () => {
  it('usa datas locais e rejeita dias inexistentes', () => {
    expect(localDate(new Date(2026, 10, 14, 23))).toBe('2026-11-14');
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2024-02-29')).toBe(true);
  });
  it('gera calendário pelos dias da turma e mantém dias com registros antigos', () => {
    const columns = attendanceColumns(2026, 11, [1, 3], ['2026-11-10']);
    expect(columns.map((column) => column.date)).toContain('2026-11-10');
    expect(columns.map((column) => column.date)).toContain('2026-11-09');
    expect(columns.map((column) => column.date)).not.toContain('2026-11-12');
    expect(new Set(columns.map((column) => column.date)).size).toBe(columns.length);
  });
  it('habilita a chamada de hoje e mantém chamadas passadas bloqueadas por padrão', () => {
    const today = new Date();
    const todayValue = localDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayValue = localDate(yesterday);
    const columns = attendanceColumns(
      today.getFullYear(),
      today.getMonth() + 1,
      [],
      [yesterdayValue],
    );

    expect(columns.find((column) => column.date === todayValue)?.editable).toBe(true);
    expect(columns.find((column) => column.date === yesterdayValue)?.editable).toBe(false);
  });
  it('cicla marcas sem perder o estado vazio', () => {
    expect(nextAttendance(null)).toBe('presente');
    expect(nextAttendance('presente')).toBe('falta');
    expect(nextAttendance('falta')).toBeNull();
    expect(nextAssessment(null)).toBe('ok');
    expect(nextAssessment('ok')).toBe('nao-ok');
    expect(nextAssessment('nao-ok')).toBeNull();
  });
  it('aceita links antigos e rotas de gestão, restringindo retornos externos', () => {
    expect(safeReturn('./registro-aula.html?turma=6a')).toBe('/registro-aula?turma=6a');
    expect(safeReturn('//evil.test')).toBe('/turmas');
    expect(safeReturn('https://evil.test')).toBe('/turmas');
    expect(safeReturn('/coordenacao')).toBe('/coordenacao');
    expect(safeReturn('/coordenacao?busca=Angular')).toBe('/coordenacao?busca=Angular');
    expect(safeReturn('/turma-form')).toBe('/turma-form');
    expect(safeReturn('/turmas/6a/gerenciar')).toBe('/turmas/6a/gerenciar');
  });
  it('rejeita intervalos invertidos no histórico', () => {
    expect(() =>
      filterHistory([], {
        turmaId: '',
        tipo: '',
        inicio: '2026-11-14',
        fim: '2026-11-01',
        conteudo: '',
      }),
    ).toThrow('data final');
  });
});
