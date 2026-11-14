import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HistoryStore, filterHistory } from './history.store';
import type { HistoryRecord } from './history.store';
import { ClassesStore } from '../classes/classes.store';
import { Feedback } from '../../shared/ui/feedback';
import { Modal } from '../../shared/ui/modal';
import { RecordDetails } from './record-details';
import { formatDate } from '../../shared/utils/dates';
import { errorMessage } from '../../shared/utils/errors';
@Component({
  selector: 'app-history',
  imports: [ReactiveFormsModule, Feedback, Modal, RecordDetails],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  readonly classes = inject(ClassesStore);
  private readonly store = inject(HistoryStore);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.params.get('turma') ?? '',
    tipo: this.params.get('tipo') ?? '',
    inicio: '',
    fim: '',
    conteudo: '',
  });
  readonly applied = signal(this.form.getRawValue());
  readonly filtered = computed(() => filterHistory(this.store.records(), this.applied()));
  readonly page = signal(1);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)));
  readonly visible = computed(() =>
    this.filtered().slice((this.page() - 1) * 10, this.page() * 10),
  );
  readonly selected = signal<HistoryRecord | null>(null);
  readonly message = signal('');
  readonly formatDate = formatDate;
  search(): void {
    try {
      filterHistory([], this.form.getRawValue());
      this.applied.set(this.form.getRawValue());
      this.page.set(1);
      this.message.set('');
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
  clear(): void {
    this.form.setValue({ turmaId: '', tipo: '', inicio: '', fim: '', conteudo: '' });
    this.search();
  }
  previous(): void {
    this.page.update((page) => Math.max(1, page - 1));
  }
  next(): void {
    this.page.update((page) => Math.min(this.pageCount(), page + 1));
  }
}
