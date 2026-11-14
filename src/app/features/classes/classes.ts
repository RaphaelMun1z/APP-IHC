import { Action } from '../../shared/ui/action';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { ListHeader } from '../../shared/ui/list-header';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ClassesStore } from './classes.store';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';

@Component({
  selector: 'app-classes',
  imports: [Action, FilterPanel, ListHeader, FormsModule, RouterLink, Feedback],
  templateUrl: './classes.html',
  styleUrl: './classes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Classes {
  readonly store = inject(ClassesStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly query = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  readonly chips = computed(() =>
    this.query().trim() ? [{ key: 'query', label: 'Busca', value: this.query().trim() }] : [],
  );
  readonly currentUrl = computed(
    () => '/turmas' + (this.query() ? '?busca=' + encodeURIComponent(this.query()) : ''),
  );
  setQuery(value: string): void {
    this.query.set(value);
    this.selected.set([]);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { busca: value || null },
      replaceUrl: true,
    });
  }
  readonly filtered = computed(() =>
    this.store
      .active()
      .filter((group) =>
        group.nome
          .toLocaleLowerCase('pt-BR')
          .includes(this.query().trim().toLocaleLowerCase('pt-BR')),
      ),
  );
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
  remove(ids: readonly string[]): void {
    if (
      !ids.length ||
      !window.confirm(
        `Excluir ${ids.length === 1 ? 'a turma selecionada' : `as ${ids.length} turmas selecionadas`}? Os registros pedagógicos associados também serão removidos.`,
      )
    )
      return;
    try {
      this.store.delete(ids);
      this.selected.set([]);
      this.isError.set(false);
      this.message.set('Turma(s) excluída(s).');
    } catch (error: unknown) {
      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
