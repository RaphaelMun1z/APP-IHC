import { DEFAULT_PAGE_SIZE, PAGE_SIZES, Pagination } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryStore, filterHistory } from './history.store';
import { ClassesStore } from '../classes/classes.store';
import { Feedback } from '../../shared/ui/feedback';

import { formatDate } from '../../shared/utils/dates';
import { errorMessage } from '../../shared/utils/errors';
import { FilterOptions, type FilterOption } from '../../shared/ui/filter-options';
@Component({
  selector: 'app-history',
  imports: [
    FilterOptions,
    Pagination,
    ListHeader,
    DataTable,
    FilterPanel,
    FormsModule,
    ReactiveFormsModule,
    Feedback,
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  readonly classes = inject(ClassesStore);
  private readonly store = inject(HistoryStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly currentUrl = signal(navigationUrl(this.router));
  readonly recordTypeOptions: readonly FilterOption[] = [
    { value: '', label: 'Todos' },
    { value: 'aula', label: 'Aula' },
    { value: 'frequencia', label: 'Frequência' },
    { value: 'avaliacao', label: 'Avaliação' },
  ];
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: this.params.get('turma') ?? '',
    tipo: this.params.get('tipo') ?? '',
    inicio: this.params.get('inicio') ?? '',
    fim: this.params.get('fim') ?? '',
    conteudo: this.params.get('conteudo') ?? '',
  });
  readonly applied = signal(this.form.getRawValue());
  readonly filtered = computed(() => {
    try {
      return filterHistory(this.store.records(), this.applied());
    } catch {
      return [];
    }
  });
  readonly pageSize = signal<number>(
    PAGE_SIZES.find((size) => size === Number(this.params.get('limite'))) ?? DEFAULT_PAGE_SIZE,
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
        limite: this.pageSize() !== DEFAULT_PAGE_SIZE ? this.pageSize() : null,
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
