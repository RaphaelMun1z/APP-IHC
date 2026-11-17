import { Action } from '../../shared/ui/action';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { ListHeader } from '../../shared/ui/list-header';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClassesStore } from './classes.store';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';
import { Tooltip } from '../../shared/ui/tooltip';
import { FilterOptions, type FilterOption } from '../../shared/ui/filter-options';

@Component({
  selector: 'app-classes',
  imports: [
    Tooltip,
    FilterOptions,
    Action,
    DataTable,
    FilterPanel,
    ListHeader,
    FormsModule,
    RouterLink,
    Feedback,
    Pagination,
  ],
  templateUrl: './classes.html',
  styleUrl: './classes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Classes {
  readonly store = inject(ClassesStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly query = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  readonly courseId = signal(this.route.snapshot.queryParamMap.get('curso') ?? '');
  readonly statusOptions: readonly FilterOption[] = [
    { value: 'ativas', label: 'Ativas' },
    { value: 'arquivadas', label: 'Arquivadas' },
    { value: 'todas', label: 'Todas' },
  ];
  readonly status = signal<'ativas' | 'arquivadas' | 'todas'>(
    ['ativas', 'arquivadas', 'todas'].includes(
      this.route.snapshot.queryParamMap.get('situacao') ?? '',
    )
      ? (this.route.snapshot.queryParamMap.get('situacao') as 'ativas' | 'arquivadas' | 'todas')
      : 'ativas',
  );
  readonly currentUrl = computed(() =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/turmas'], { queryParams: this.queryParams() }),
    ),
  );
  setQuery(value: string): void {
    this.query.set(value);
  }
  setCourse(value: string): void {
    this.courseId.set(value);
  }
  setStatus(value: string): void {
    if (value !== 'ativas' && value !== 'arquivadas' && value !== 'todas') return;
    this.status.set(value);
  }
  private queryParams() {
    return {
      busca: this.query() || null,
      curso: this.courseId() || null,
      situacao: this.status() !== 'ativas' ? this.status() : null,
    };
  }
  persist(): void {
    this.selected.set([]);
    this.paging.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.queryParams(),
      replaceUrl: true,
    });
  }
  readonly filtered = computed(() =>
    this.store
      .accessible()
      .filter(
        (group) =>
          group.nome
            .toLocaleLowerCase('pt-BR')
            .includes(this.query().trim().toLocaleLowerCase('pt-BR')) &&
          (!this.courseId() || group.cursoId === this.courseId()) &&
          (this.status() === 'todas' || group.ativa === (this.status() === 'ativas')),
      ),
  );
  readonly paging = new TablePage(() => this.filtered().length);
  readonly visible = computed(() => this.paging.slice(this.filtered()));
  readonly chips = computed(() => [
    ...(this.query().trim() ? [{ key: 'query', label: 'Busca', value: this.query().trim() }] : []),
    ...(this.courseId()
      ? [
          {
            key: 'course',
            label: 'Curso',
            value: this.store.course(this.courseId())?.nome ?? this.courseId(),
          },
        ]
      : []),
    ...(this.status() !== 'ativas'
      ? [
          {
            key: 'status',
            label: 'Situação',
            value: this.status() === 'todas' ? 'Todas' : 'Arquivadas',
          },
        ]
      : []),
  ]);
  removeFilter(key: string): void {
    if (key === 'query') this.query.set('');
    if (key === 'course') this.courseId.set('');
    if (key === 'status') this.status.set('ativas');
    this.persist();
  }
  clearFilters(): void {
    this.query.set('');
    this.courseId.set('');
    this.status.set('ativas');
    this.persist();
  }
  readonly selected = signal<readonly string[]>([]);
  readonly allSelected = computed(
    () =>
      this.filtered().length > 0 &&
      this.filtered().every((group) => this.selected().includes(group.id)),
  );
  readonly message = signal(
    this.route.snapshot.queryParamMap.has('indisponivel')
      ? 'Turma não encontrada ou sem permissão de acesso.'
      : '',
  );
  readonly isError = signal(false);
  toggle(id: string): void {
    this.selected.update((values) => toggleValue(values, id));
  }
  toggleAll(): void {
    this.selected.set(this.allSelected() ? [] : this.filtered().map((group) => group.id));
  }
  async togglePin(id: string): Promise<void> {
    try {
      const wasPinned = this.store.isPinned(id);
      await this.store.togglePinned(id);
      this.isError.set(false);
      this.message.set(
        wasPinned ? 'Turma removida da tela inicial.' : 'Turma fixada na tela inicial.',
      );
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
  async remove(ids: readonly string[]): Promise<void> {
    if (!ids.length) return;
    const classNames = ids.map((id) => this.store.get(id)?.nome ?? id);
    const confirmed = await this.confirm.confirm(
      'Também serão removidos os registros de aulas, frequências e avaliações vinculados a estas turmas:',
      {
        title: ids.length === 1 ? 'Excluir esta turma?' : `Excluir ${ids.length} turmas?`,
        confirmLabel: 'Excluir',
        confirmIcon: 'delete',
        items: classNames,
        itemNoun: 'turmas',
      },
    );
    if (!confirmed) return;
    try {
      await this.store.delete(ids);
      this.selected.set([]);
      this.isError.set(false);
      this.message.set('Turma(s) excluída(s).');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
