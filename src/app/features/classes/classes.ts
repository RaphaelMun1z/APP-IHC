import { Action } from '../../shared/ui/action';
import { DataTable } from '../../shared/ui/data-table';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { ListHeader } from '../../shared/ui/list-header';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClassesStore } from './classes.store';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';
import { Tooltip } from '../../shared/ui/tooltip';

@Component({
  selector: 'app-classes',
  imports: [
    Tooltip,
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
  private readonly queryParams = computed(() => ({ busca: this.query() || null }));
  readonly currentUrl = computed(() =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/turmas'], { queryParams: this.queryParams() }),
    ),
  );
  setQuery(value: string): void {
    this.query.set(value);
    this.paging.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.queryParams(),
      replaceUrl: true,
    });
  }
  readonly filtered = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.store.accessible()
      .filter((group) => group.nome.toLocaleLowerCase('pt-BR').includes(term))
      .sort((a, b) => Number(this.store.isPinned(b.id)) - Number(this.store.isPinned(a.id)));
  });
  readonly paging = new TablePage(() => this.filtered().length);
  readonly visible = computed(() => this.paging.slice(this.filtered()));
  readonly chips = computed(() => {
    const value = this.query().trim();
    return value ? [{ key: 'query', label: 'Busca', value }] : [];
  });
  readonly message = signal(
    this.route.snapshot.queryParamMap.has('indisponivel')
      ? 'Turma não encontrada ou sem permissão de acesso.'
      : '',
  );
  readonly isError = signal(false);
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
  async remove(id: string): Promise<void> {
    const confirmed = await this.confirm.confirm(
      'Também serão removidos os registros de aulas, frequências e avaliações vinculados a esta turma:',
      {
        title: 'Excluir esta turma?',
        confirmLabel: 'Excluir',
        confirmIcon: 'delete',
        items: [this.store.get(id)?.nome ?? id],
      },
    );
    if (!confirmed) return;
    try {
      await this.store.delete([id]);
      this.isError.set(false);
      this.message.set('Turma excluída.');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
