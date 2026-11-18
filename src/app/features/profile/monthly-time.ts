import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '../../core/api/catalog.api';
import { RequestState } from '../../core/api/request-state';
import { AuthService } from '../../core/auth/auth.service';
import type { MonthlyTimeRecord } from '../../core/models/domain';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage } from '../../shared/utils/errors';
import { ClassesStore } from '../classes/classes.store';

@Component({
  selector: 'app-monthly-time',
  imports: [Action, Feedback, ReactiveFormsModule],
  template: `
    <main class="app-page">
      <div class="surface content-scroll monthly-content">
        <section class="form-wizard-panel">
          <h2>{{ isProfessor ? 'Registrar horas-aula' : 'Horas-aula por professor' }}</h2>
          @if (isProfessor) {
            <form [formGroup]="form" (ngSubmit)="save()" class="form-wizard-field-stack">
              <label class="field"
                >Mês
                <select formControlName="mes">
                  @for (label of months; track label) {
                    <option [ngValue]="$index + 1">{{ label }}</option>
                  }
                </select>
              </label>
              <label class="field"
                >Ano<input
                  type="number"
                  min="1900"
                  max="9999"
                  step="1"
                  formControlName="ano"
                  required
              /></label>
              <label class="field"
                >Total de horas-aula
                <input
                  type="number"
                  min="0"
                  max="744"
                  step="0.01"
                  formControlName="totalHorasAula"
                  required
                />
              </label>
              <div>
                <button
                  appAction="save"
                  class="primary"
                  type="submit"
                  [disabled]="form.invalid || loading() || requests.saving()"
                >
                  Salvar ponto
                </button>
              </div>
            </form>
          }
          @if (!isProfessor && !loading() && !loadFailed()) {
            <label class="field"
              >Professor
              <select
                #teacherFilter
                [value]="teacherId()"
                (change)="teacherId.set(teacherFilter.value)"
              >
                <option value="">Todos os professores</option>
                @for (id of availableTeachers(); track id) {
                  <option [value]="id">{{ teacher(id) }}</option>
                }
              </select>
            </label>
          }
          <app-feedback [message]="message()" [error]="failed()" />
          @if (loadFailed()) {
            <button appAction="refresh" type="button" (click)="load()" [disabled]="loading()">
              Tentar novamente
            </button>
          }
        </section>
        <section class="form-wizard-panel">
          <h2>Pontos mensais registrados</h2>
          @if (loading()) {
            <div class="list-skeleton" role="status">
              <span class="sr-only">Carregando pontos mensais…</span>
            </div>
          } @else if (!loadFailed()) {
            <ul>
              @for (row of filteredRecords(); track row.id) {
                <li>
                  @if (!isProfessor) {
                    {{ teacher(row.professorId) }} ·
                  }
                  {{ months[row.mes - 1] }} de {{ row.ano }} ·
                  {{ formatHours(row.totalHorasAula) }} h
                  @if (isProfessor) {
                    <button appAction="edit" type="button" (click)="edit(row)">Editar</button>
                  }
                </li>
              } @empty {
                <li>Nenhum ponto mensal registrado.</li>
              }
            </ul>
          }
        </section>
      </div>
    </main>
  `,
  styles: `
    .monthly-content {
      padding: var(--content-pad, 1.5rem);
      display: grid;
      gap: 1.5rem;
      align-content: start;
      grid-template-columns: minmax(0, 1fr);
      overflow-wrap: anywhere;
    }
    section {
      width: min(100%, 46rem);
      margin-inline: auto;
    }
    li + li {
      margin-block-start: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyTime {
  private readonly api = inject(CatalogApi);
  private readonly classes = inject(ClassesStore);
  readonly requests = inject(RequestState);
  readonly isProfessor = inject(AuthService).user()?.perfil === 'professor';
  readonly teacherId = signal('');
  readonly availableTeachers = computed(() =>
    [...new Set(this.records().map((row) => row.professorId))].sort((a, b) =>
      this.teacher(a).localeCompare(this.teacher(b), 'pt-BR'),
    ),
  );
  readonly filteredRecords = computed(() =>
    this.records().filter((row) => !this.teacherId() || row.professorId === this.teacherId()),
  );
  readonly records = signal<readonly MonthlyTimeRecord[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly failed = signal(false);
  readonly message = signal('');
  private readonly today = new Date();
  readonly form = inject(FormBuilder).nonNullable.group({
    mes: [this.today.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    ano: [
      this.today.getFullYear(),
      [Validators.required, Validators.min(1900), Validators.max(9999)],
    ],
    totalHorasAula: [0, [Validators.required, Validators.min(0), Validators.max(744)]],
  });
  readonly months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2000, month, 1)),
  );

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.message.set('');
    this.failed.set(false);
    this.loadFailed.set(false);
    try {
      const { items } = await firstValueFrom(this.api.monthlyTime());
      this.setRecords(items);
    } catch (error: unknown) {
      this.loadFailed.set(true);
      this.failed.set(true);
      this.message.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (!this.isProfessor || this.form.invalid) return;
    try {
      const saved = await this.requests.mutate(this.api.saveMonthlyTime(this.form.getRawValue()));
      this.setRecords([...this.records().filter(({ id }) => id !== saved.id), saved]);
      this.failed.set(false);
      this.message.set('Ponto mensal salvo.');
    } catch (error: unknown) {
      this.failed.set(true);
      this.message.set(errorMessage(error));
    }
  }

  edit({ mes, ano, totalHorasAula }: MonthlyTimeRecord): void {
    this.form.setValue({ mes, ano, totalHorasAula });
    this.message.set('');
  }

  teacher(id: string): string {
    return this.classes.teachers.find((teacher) => teacher.id === id)?.nome ?? id;
  }

  formatHours(hours: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(hours);
  }

  private setRecords(items: readonly MonthlyTimeRecord[]): void {
    this.records.set([...items].sort((a, b) => b.ano - a.ano || b.mes - a.mes));
  }
}
