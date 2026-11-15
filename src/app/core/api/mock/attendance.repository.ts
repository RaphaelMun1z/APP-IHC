import { Injectable, computed, inject } from '@angular/core';
import { StorageService } from '../../data/storage.service';
import { storageKeys } from '../../data/storage-keys';
import { isAttendance, normalizeAttendance } from '../../data/validators';
import type { AttendanceData, AttendanceDay } from '../../models/domain';
import { requirePastDate } from '../../../shared/utils/dates';
import { MockClassesRepository } from './classes.repository';

@Injectable({ providedIn: 'root' })
export class MockAttendanceRepository {
  private readonly storage = inject(StorageService);
  private readonly classes = inject(MockClassesRepository);
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
