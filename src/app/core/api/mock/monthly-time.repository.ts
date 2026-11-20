import { Injectable, inject } from '@angular/core';
import { storageKeys } from '../../data/storage-keys';
import { StorageService } from '../../data/storage.service';
import type { MonthlyTimeRecord } from '../../models/domain';
import { ApiFailure } from '../contracts';
import { MockSession } from './mock-session';

function timeInput(
  input: Record<string, unknown>,
): input is Record<string, unknown> & Pick<MonthlyTimeRecord, 'mes' | 'ano' | 'totalHorasAula'> {
  const { mes, ano, totalHorasAula } = input;
  return (
    typeof mes === 'number' &&
    Number.isInteger(mes) &&
    mes >= 1 &&
    mes <= 12 &&
    typeof ano === 'number' &&
    Number.isInteger(ano) &&
    ano >= 1900 &&
    ano <= 9999 &&
    typeof totalHorasAula === 'number' &&
    Number.isFinite(totalHorasAula) &&
    totalHorasAula >= 0 &&
    totalHorasAula <= 744 &&
    Math.abs(totalHorasAula * 100 - Math.round(totalHorasAula * 100)) < 1e-7
  );
}

function isMonthlyTime(value: unknown): value is MonthlyTimeRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row && typeof row.id === 'string' && typeof row.professorId === 'string' && timeInput(row),
    )
  );
}

@Injectable({ providedIn: 'root' })
export class MockMonthlyTimeRepository {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(MockSession);
  private records(): readonly MonthlyTimeRecord[] {
    return this.storage.read<readonly MonthlyTimeRecord[]>(
      storageKeys.monthlyTime,
      [],
      isMonthlyTime,
    );
  }

  list(): readonly MonthlyTimeRecord[] {
    const user = this.auth.user();
    return this.records().filter(
      ({ professorId }) => user?.perfil === 'coordenacao' || professorId === user?.id,
    );
  }

  create(input: Record<string, unknown>): MonthlyTimeRecord {
    const user = this.auth.user();
    if (user?.perfil !== 'professor')
      throw new ApiFailure(403, {
        code: 'FORBIDDEN',
        message: 'O ponto mensal deve ser lançado pelo professor.',
      });
    if (!timeInput(input))
      throw new Error('Informe mês, ano e horas válidos, com até duas casas decimais.');
    const { mes, ano, totalHorasAula } = input;
    const records = this.records();
    const exists = records.some(
      (row) => row.professorId === user.id && row.mes === mes && row.ano === ano,
    );
    if (exists) {
      throw new ApiFailure(409, {
        code: 'MONTHLY_TIME_EXISTS',
        message: 'Você já lançou as horas-aula deste mês. Escolha outro período.',
      });
    }
    const record = {
      id: crypto.randomUUID(),
      professorId: user.id,
      mes,
      ano,
      totalHorasAula,
    };
    this.storage.write(storageKeys.monthlyTime, [...records, record]);
    return record;
  }
}
