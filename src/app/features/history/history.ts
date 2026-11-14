import { Pagination } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { Action } from '../../shared/ui/action';
import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HistoryStore, filterHistory } from './history.store';
import type { HistoryRecord } from './history.store';
import { ClassesStore } from '../classes/classes.store';
import { Feedback } from '../../shared/ui/feedback';
import { AuthService } from '../../core/auth/auth.service';

import { formatDate } from '../../shared/utils/dates';
import { errorMessage } from '../../shared/utils/errors';
@Component({
  selector: 'app-history',
  imports: [
    Pagination,
    ListHeader,
    DataTable,
    FilterPanel,
    Action,
    FormsModule,
    ReactiveFormsModule,
    Feedback,
    RouterLink,
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  editLink(item: HistoryRecord): string[] {
    return item.tipo === 'aula'
      ? ['/turmas', item.turmaId, 'aulas', item.id, 'editar']
      : ['/turmas', item.turmaId, item.tipo === 'frequencia' ? 'frequencia' : 'avaliacoes'];
  }
  readonly classes = inject(ClassesStore);
  private readonly store = inject(HistoryStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly currentUrl = signal(navigationUrl(this.router));
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.params.get('turma') ?? '',
    tipo: this.params.get('tipo') ?? '',
    inicio: this.params.get('inicio') ?? '',
    fim: this.params.get('fim') ?? '',
    conteudo: this.params.get('conteudo') ?? '',
    professorId: this.auth.isCoordinator() ? (this.params.get('professor') ?? '') : '',
  });
  readonly applied = signal(this.form.getRawValue());
  readonly filtered = computed(() => {
    try {
      return filterHistory(this.store.records(), this.applied()).filter(
        (record) =>
          !this.applied().professorId ||
          (record.tipo === 'frequencia'
            ? this.classes.get(record.turmaId)?.professorId
            : record.registro.professorId) === this.applied().professorId,
      );
    } catch {
      return [];
    }
  });
  readonly pageSize = signal(
    [10, 15, 25, 50].includes(Number(this.params.get('limite')))
      ? Number(this.params.get('limite'))
      : 10,
  );
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize())),
  );
  readonly page = signal(
    Math.min(this.pageCount(), Math.max(1, Math.floor(Number(this.params.get('pagina'))) || 1)),
  );
  readonly visible = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()),
  );
  readonly message = signal('');
  readonly formatDate = formatDate;
  constructor() {
    try {
      filterHistory([], this.applied());
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
  search(): void {
    try {
      filterHistory([], this.form.getRawValue());
      this.applied.set(this.form.getRawValue());
      this.page.set(1);
      this.message.set('');
      this.persist();
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
  clear(): void {
    this.form.setValue({
      turmaId: '',
      tipo: '',
      inicio: '',
      fim: '',
      conteudo: '',
      professorId: '',
    });
    this.search();
  }
  private persist(): void {
    const v = this.applied();
    const tree = this.router.createUrlTree(['/historico'], {
      queryParams: {
        turma: v.turmaId || null,
        tipo: v.tipo || null,
        inicio: v.inicio || null,
        fim: v.fim || null,
        conteudo: v.conteudo || null,
        professor: v.professorId || null,
        limite: this.pageSize() !== 10 ? this.pageSize() : null,
        pagina: this.page() > 1 ? this.page() : null,
      },
    });
    this.currentUrl.set(this.router.serializeUrl(tree));
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }
  previous(): void {
    this.page.update((page) => Math.max(1, page - 1));
    this.persist();
  }
  next(): void {
    this.page.update((page) => Math.min(this.pageCount(), page + 1));
    this.persist();
  }

  readonly chips = computed(() => {
    const f = this.applied();
    const labels: Record<string, string> = {
      turmaId: 'Turma',
      tipo: 'Tipo',
      professorId: 'Professor',
      inicio: 'Desde',
      fim: 'Até',
      conteudo: 'Busca',
    };
    return Object.entries(f)
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({
        key,
        label: labels[key],
        value:
          key === 'turmaId'
            ? (this.classes.get(value)?.nome ?? value)
            : key === 'professorId'
              ? (this.classes.teachers.find((t) => t.id === value)?.nome ?? value)
              : key === 'tipo'
                ? ({ aula: 'Aula', frequencia: 'Frequência', avaliacao: 'Avaliação' }[value] ??
                  value)
                : key === 'inicio' || key === 'fim'
                  ? formatDate(value)
                  : value,
      }));
  });
  removeFilter(key: string): void {
    this.form.setValue({ ...this.applied(), [key]: '' });
    this.search();
  }
  changePage(value: number): void {
    this.page.set(value);
    this.persist();
  }
  changeSize(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
    this.persist();
  }
}
