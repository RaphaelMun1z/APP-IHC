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

@Component({
  selector: 'app-classes',
  imports: [
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly query = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  readonly teacher = signal(this.route.snapshot.queryParamMap.get('professor') ?? '');
  readonly courseId = signal(this.route.snapshot.queryParamMap.get('curso') ?? '');
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
    this.persist();
  }
  setTeacher(value: string): void {
    this.teacher.set(value);
    this.persist();
  }
  setCourse(value: string): void {
    this.courseId.set(value);
    this.persist();
  }
  setStatus(value: 'ativas' | 'arquivadas' | 'todas'): void {
    this.status.set(value);
    this.persist();
  }
  private queryParams() {
    return {
      busca: this.query() || null,
      professor: this.teacher() || null,
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
          (!this.teacher() || group.professorId === this.teacher()) &&
          (!this.courseId() || group.cursoId === this.courseId()) &&
          (this.status() === 'todas' || group.ativa === (this.status() === 'ativas')),
      ),
  );
  readonly paging = new TablePage(() => this.filtered().length);
  readonly visible = computed(() => this.paging.slice(this.filtered()));
  readonly chips = computed(() => [
    ...(this.query().trim() ? [{ key: 'query', label: 'Busca', value: this.query().trim() }] : []),
    ...(this.teacher()
      ? [
          {
            key: 'teacher',
            label: 'Professor',
            value: this.teacherName(this.teacher()),
          },
        ]
      : []),
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
    if (key === 'teacher') this.teacher.set('');
    if (key === 'course') this.courseId.set('');
    if (key === 'status') this.status.set('ativas');
    this.persist();
  }
  clearFilters(): void {
    this.query.set('');
    this.teacher.set('');
    this.courseId.set('');
    this.status.set('ativas');
    this.persist();
  }
  teacherName(id: string): string {
    return this.store.teachers.find((person) => person.id === id)?.nome ?? '—';
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
    if (
      !ids.length ||
      !window.confirm(
        `Excluir ${ids.length === 1 ? 'a turma selecionada' : `as ${ids.length} turmas selecionadas`}? Os registros pedagógicos associados também serão removidos.`,
      )
    )
      return;
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
