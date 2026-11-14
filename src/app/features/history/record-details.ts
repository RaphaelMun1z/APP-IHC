import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { DataTable } from '../../shared/ui/data-table';
import { Badge } from '../../shared/ui/badge';
import { Action } from '../../shared/ui/action';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HistoryRecord } from './history.store';
import { ClassesStore } from '../classes/classes.store';
import { criteria } from '../../core/data/catalog';
import { lessonTypes } from '../../core/models/domain';
import { formatDate } from '../../shared/utils/dates';
@Component({
  selector: 'app-record-details',
  host: { '[class.tabular]': "record().tipo !== 'aula'" },
  imports: [Pagination, ListHeader, DataTable, PersonAvatar, Badge, Action, RouterLink],
  templateUrl: './record-details.html',
  styleUrl: './record-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordDetails {
  readonly returnUrl = input('/historico');
  readonly record = input.required<HistoryRecord>();
  readonly classes = inject(ClassesStore);
  readonly criteria = criteria;
  readonly types = lessonTypes;
  readonly formatDate = formatDate;

  readonly attendanceRows = computed(() => {
    const item = this.record();
    return item.tipo === 'frequencia'
      ? this.classes.students.filter(
          (student) =>
            this.classes.get(item.turmaId)?.alunoIds.includes(student.id) ||
            item.registro[student.id],
        )
      : [];
  });
  readonly assessmentRows = computed(() => {
    const item = this.record();
    return item.tipo === 'avaliacao'
      ? item.registro.alunos.flatMap((student) =>
          this.criteria
            .filter((criterion) => student.avaliacoes[criterion.id])
            .map((criterion) => ({ student, criterion, mark: student.avaliacoes[criterion.id] })),
        )
      : [];
  });
  readonly paging = new TablePage(() =>
    this.record().tipo === 'frequencia'
      ? this.attendanceRows().length
      : this.assessmentRows().length,
  );
  readonly visibleAttendance = computed(() => this.paging.slice(this.attendanceRows()));
  readonly visibleAssessments = computed(() => this.paging.slice(this.assessmentRows()));
}
