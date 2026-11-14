import { Injectable, computed, inject } from '@angular/core';
import { StorageService } from '../../core/data/storage.service';
import { storageKeys } from '../../core/data/storage-keys';
import { isAttendance, normalizeAttendance } from '../../core/data/validators';
import type { AttendanceData, AttendanceDay, AttendanceMark } from '../../core/models/domain';
import { requirePastDate, localDate } from '../../shared/utils/dates';
import { ClassesStore } from '../classes/classes.store';

export interface AttendanceColumn {
  readonly date: string;
  readonly day: string;
  readonly number: string;
  readonly editable: boolean;
}
export function attendanceColumns(
  year: number,
  month: number,
  days: readonly number[],
  recordedDates: readonly string[] = [],
): AttendanceColumn[] {
  const result: AttendanceColumn[] = [];
  const count = new Date(year, month, 0).getDate();
  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month - 1, day, 12);
    const value = localDate(date);
    if (days.includes(date.getDay()) || recordedDates.includes(value))
      result.push({
        date: value,
        day: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        number: String(day).padStart(2, '0'),
        editable: value <= localDate(),
      });
  }
  return result;
}
export function nextAttendance(mark: AttendanceMark): AttendanceMark {
  return mark === null ? 'presente' : mark === 'presente' ? 'falta' : null;
}
@Injectable({ providedIn: 'root' })
export class AttendanceStore {
  private readonly storage = inject(StorageService);
  private readonly classes = inject(ClassesStore);
  private readonly all = this.storage.collection<AttendanceData>(
    storageKeys.attendance,
    {},
    isAttendance,
    normalizeAttendance,
  );
  readonly records = computed<AttendanceData>(() =>
    Object.fromEntries(
      this.classes.accessible().map((group) => [group.id, this.all()[group.id] ?? {}]),
    ),
  );
  saveMonth(classId: string, days: Readonly<Record<string, AttendanceDay>>): void {
    const group = this.classes.require(classId, true);
    for (const [date, marks] of Object.entries(days)) {
      requirePastDate(date);
      if (
        Object.entries(marks).some(
          ([id, mark]) =>
            !group.alunoIds.includes(id) ||
            (mark !== null && mark !== 'presente' && mark !== 'falta'),
        )
      )
        throw new Error('A frequência contém alunos ou marcações inválidas.');
    }
    const previous = this.all()[classId] ?? {};
    // Keep historical marks for students subsequently removed from the class.
    const updated = Object.fromEntries(
      Object.entries(days).map(([date, marks]) => [date, { ...previous[date], ...marks }]),
    );
    this.storage.write(storageKeys.attendance, {
      ...this.all(),
      [classId]: { ...previous, ...updated },
    });
  }
}
