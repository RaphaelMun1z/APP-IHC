import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { DataState } from '../../core/api/data-state';
import { RequestState } from '../../core/api/request-state';
import type { AttendanceData, AttendanceDay } from '../../core/models/domain';
import { ClassesStore } from '../classes/classes.store';
import { AttendanceApi } from './attendance.api';
export { attendanceColumns, nextAttendance } from './attendance-calendar';

@Injectable({ providedIn: 'root' })
export class AttendanceStore {
  private readonly state = inject(DataState);
  private readonly classes = inject(ClassesStore);
  private readonly api = inject(AttendanceApi);
  private readonly requests = inject(RequestState);
  readonly records = computed<AttendanceData>(() =>
    Object.fromEntries(
      this.classes.accessible().map((group) => [group.id, this.state.attendance()[group.id] ?? {}]),
    ),
  );
  async saveMonth(classId: string, days: Readonly<Record<string, AttendanceDay>>): Promise<void> {
    await this.requests.mutate(
      this.api.save(classId, { dias: days }).pipe(
        tap((saved) => {
          this.state.attendance.update((records) => ({ ...records, [saved.turmaId]: saved.dias }));
        }),
      ),
    );
  }
}
