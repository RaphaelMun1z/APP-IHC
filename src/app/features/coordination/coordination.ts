import { Pagination, TablePage } from '../../shared/ui/pagination';
import { ListHeader } from '../../shared/ui/list-header';
import { PersonAvatar } from '../../shared/ui/person-avatar';
import { DataTable } from '../../shared/ui/data-table';
import { Badge } from '../../shared/ui/badge';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { Action } from '../../shared/ui/action';
import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../shared/utils/errors';
import { Feedback } from '../../shared/ui/feedback';
import { ClassesStore } from '../classes/classes.store';
@Component({
  selector: 'app-coordination',
  imports: [
    Pagination,
    ListHeader,
    PersonAvatar,
    DataTable,
    Badge,
    FilterPanel,
    Action,
    FormsModule,
    RouterLink,
    Feedback,
  ],
  templateUrl: './coordination.html',
  styleUrl: './coordination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination {
  remove(id: string): void {
    if (
      !window.confirm(
        'Excluir esta turma e todos os registros pedagógicos associados? Esta ação não pode ser desfeita.',
      )
    )
      return;
    try {
      this.classes.delete([id]);
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
  readonly classes = inject(ClassesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly query = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  readonly teacher = signal(this.route.snapshot.queryParamMap.get('professor') ?? '');
  readonly status = signal(this.route.snapshot.queryParamMap.get('situacao') ?? 'ativas');
  readonly currentUrl = signal(navigationUrl(this.router));
  readonly message = signal('');
  persist(): void {
    const tree = this.router.createUrlTree(['/coordenacao'], {
      queryParams: {
        pagina: this.paging.current() === 1 ? null : this.paging.current(),
        limite: this.paging.size(),
        busca: this.query() || null,
        professor: this.teacher() || null,
        situacao: this.status(),
      },
    });
    this.currentUrl.set(this.router.serializeUrl(tree));
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }
  toggleStatus(id: string): void {
    const group = this.classes.get(id);
    if (
      !group ||
      !window.confirm(
        group.ativa
          ? 'Arquivar esta turma? Os registros serão preservados.'
          : 'Reativar esta turma?',
      )
    )
      return;
    try {
      this.classes.save({ ...group, ativa: !group.ativa });
    } catch (error) {
      this.message.set(errorMessage(error));
    }
  }
  readonly filtered = computed(() =>
    this.classes
      .accessible()
      .filter(
        (group) =>
          group.nome
            .toLocaleLowerCase('pt-BR')
            .includes(this.query().trim().toLocaleLowerCase('pt-BR')) &&
          (!this.teacher() || group.professorId === this.teacher()) &&
          (this.status() === 'todas' || group.ativa === (this.status() === 'ativas')),
      ),
  );
  teacherName(id: string): string {
    return this.classes.teachers.find((teacher) => teacher.id === id)?.nome ?? '—';
  }

  readonly paging = new TablePage(() => this.filtered().length);
  readonly visible = computed(() => this.paging.slice(this.filtered()));
  readonly chips = computed(() => [
    ...(this.query().trim() ? [{ key: 'query', label: 'Busca', value: this.query().trim() }] : []),
    ...(this.teacher()
      ? [{ key: 'teacher', label: 'Professor', value: this.teacherName(this.teacher()) }]
      : []),
    ...(this.status() !== 'todas'
      ? [
          {
            key: 'status',
            label: 'Situação',
            value: this.status() === 'ativas' ? 'Ativas' : 'Arquivadas',
          },
        ]
      : []),
  ]);
  removeFilter(key: string): void {
    if (key === 'query') this.query.set('');
    if (key === 'teacher') this.teacher.set('');
    if (key === 'status') this.status.set('todas');
    this.paging.page.set(1);
    this.persist();
  }
  clearFilters(): void {
    this.query.set('');
    this.teacher.set('');
    this.status.set('todas');
    this.paging.page.set(1);
    this.persist();
  }
  changePage(value: number): void {
    this.paging.page.set(value);
    this.persist();
  }
  changeSize(value: number): void {
    this.paging.resize(value);
    this.persist();
  }

  constructor() {
    const size = Number(this.route.snapshot.queryParamMap.get('limite'));
    if ([10, 15, 25, 50].includes(size)) this.paging.size.set(size);
    this.paging.page.set(Math.max(1, Number(this.route.snapshot.queryParamMap.get('pagina')) || 1));
  }
}
