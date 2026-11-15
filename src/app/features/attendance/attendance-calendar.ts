import type { AttendanceMark } from '../../core/models/domain';
import { localDate } from '../../shared/utils/dates';

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
  const today = localDate();
  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month - 1, day, 12);
    const value = localDate(date);
    if (days.includes(date.getDay()) || recordedDates.includes(value) || value === today)
      result.push({
        date: value,
        day: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        number: String(day).padStart(2, '0'),
        editable: value === today,
      });
  }
  return result;
}
export function nextAttendance(mark: AttendanceMark): AttendanceMark {
  return mark === null ? 'presente' : mark === 'presente' ? 'falta' : null;
}
