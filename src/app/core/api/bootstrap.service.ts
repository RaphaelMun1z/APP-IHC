import { Injectable, inject } from '@angular/core';
import { catchError, finalize, firstValueFrom, forkJoin, map, of, shareReplay, tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { ClassesApi } from '../../features/classes/classes.api';
import { LessonsApi } from '../../features/lessons/lessons.api';
import { AttendanceApi } from '../../features/attendance/attendance.api';
import { AssessmentsApi } from '../../features/assessments/assessments.api';
import { CatalogApi } from './catalog.api';
import { DataState } from './data-state';
import { errorMessage } from '../../shared/utils/errors';

@Injectable({ providedIn: 'root' })
export class BootstrapService {
  private readonly classes = inject(ClassesApi);
  private readonly catalog = inject(CatalogApi);
  private readonly lessons = inject(LessonsApi);
  private readonly attendance = inject(AttendanceApi);
  private readonly assessments = inject(AssessmentsApi);
  private readonly state = inject(DataState);
  private inFlight?: Observable<boolean>;

  load(): Observable<boolean> {
    if (this.state.ready()) return of(true);
    if (this.inFlight) return this.inFlight;
    this.state.error.set('');
    this.inFlight = forkJoin({
      classes: this.classes.list(),
      pins: this.classes.pins(),
      catalog: this.catalog.catalog(),
      students: this.catalog.students(),
      lessons: this.lessons.list(),
      attendance: this.attendance.list(),
      assessments: this.assessments.list(),
    }).pipe(
      tap((data) => {
        this.state.classes.set(data.classes.items);
        this.state.pins.set(data.pins.turmaIds);
        this.state.catalog.set(data.catalog);
        this.state.students.set(data.students.items);
        this.state.lessons.set(data.lessons.items);
        this.state.attendance.set(
          Object.fromEntries(data.attendance.items.map((item) => [item.turmaId, item.dias])),
        );
        this.state.assessments.set(
          Object.fromEntries(data.assessments.registros.map((item) => [item.lessonId, item])),
        );
        this.state.unlinked.set(data.assessments.legadasSemAula);
        this.state.migrationMessage.set(data.assessments.avisoMigracao);
        this.state.ready.set(true);
      }),
      map(() => true),
      catchError((error: unknown) => {
        this.state.error.set(errorMessage(error));
        return of(false);
      }),
      finalize(() => {
        this.inFlight = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.inFlight;
  }

  async retry(): Promise<void> {
    await firstValueFrom(this.load());
  }
}
