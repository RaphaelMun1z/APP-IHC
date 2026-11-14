import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HistoryRecord } from './history.store';
import { ClassesStore } from '../classes/classes.store';
import { criteria, students } from '../../core/data/catalog';
import { lessonTypes } from '../../core/models/domain';
import { formatDate } from '../../shared/utils/dates';
@Component({
  selector: 'app-record-details',
  imports: [RouterLink],
  templateUrl: './record-details.html',
  styleUrl: './record-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordDetails {
  readonly record = input.required<HistoryRecord>();
  readonly classes = inject(ClassesStore);
  readonly criteria = criteria;
  readonly students = students;
  readonly types = lessonTypes;
  readonly formatDate = formatDate;
}
