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
  it('cicla marcas sem perder o estado vazio', () => {
    expect(nextAttendance(null)).toBe('presente');
    expect(nextAttendance('presente')).toBe('falta');
    expect(nextAttendance('falta')).toBeNull();
    expect(nextAssessment(null)).toBe('ok');
    expect(nextAssessment('ok')).toBe('nao-ok');
    expect(nextAssessment('nao-ok')).toBeNull();
  });
  it('aceita links antigos com parâmetros e restringe retornos por perfil', () => {
    expect(safeReturn('./registro-aula.html?turma=6a', false)).toBe('/registro-aula?turma=6a');
    expect(safeReturn('//evil.test', true)).toBe('/inicio');
    expect(safeReturn('https://evil.test', true)).toBe('/inicio');
    expect(safeReturn('/coordenacao', false)).toBe('/inicio');
    expect(safeReturn('/turma-form', true)).toBe('/turma-form');
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
