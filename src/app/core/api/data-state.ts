import { Injectable, signal } from '@angular/core';
import type {
  AssessmentData,
  AttendanceData,
  Lesson,
  SchoolClass,
  Student,
} from '../models/domain';
import type { CatalogDto, UnlinkedAssessmentDto } from './contracts';

@Injectable({ providedIn: 'root' })
export class DataState {
  readonly ready = signal(false);
  readonly error = signal('');
  readonly classes = signal<readonly SchoolClass[]>([]);
  readonly students = signal<readonly Student[]>([]);
  readonly pins = signal<readonly string[]>([]);
  readonly catalog = signal<CatalogDto>({ cursos: [], professores: [], criterios: [] });
  readonly lessons = signal<readonly Lesson[]>([]);
  readonly attendance = signal<AttendanceData>({});
  readonly assessments = signal<AssessmentData>({});
  readonly unlinked = signal<readonly UnlinkedAssessmentDto[]>([]);
  readonly migrationMessage = signal('');

  reset(): void {
    this.ready.set(false);
    this.error.set('');
    this.classes.set([]);
    this.students.set([]);
    this.pins.set([]);
    this.catalog.set({ cursos: [], professores: [], criterios: [] });
    this.lessons.set([]);
    this.attendance.set({});
    this.assessments.set({});
    this.unlinked.set([]);
    this.migrationMessage.set('');
  }
}
