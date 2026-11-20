import { FieldError } from '../../shared/ui/field-error';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { orderByNumber } from '../../shared/utils/collections';
import { MonthlyTimeStore, periodOrder } from './monthly-time.store';
import { RequestState } from '../../core/api/request-state';
import { AuthService } from '../../core/auth/auth.service';
import { Action } from '../../shared/ui/action';
import { Feedback } from '../../shared/ui/feedback';
import { LoadingSkeleton } from '../../shared/ui/loading-skeleton';
import { DataTable } from '../../shared/ui/data-table';
import { errorMessage } from '../../shared/utils/errors';
import { ClassesStore } from '../classes/classes.store';

@Component({
  selector: 'app-monthly-time',
  providers: [MonthlyTimeStore],
  imports: [FieldError, LoadingSkeleton, Action, DataTable, Feedback, ReactiveFormsModule],
  templateUrl: './monthly-time.html',
  styleUrl: './monthly-time.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyTime {
  private readonly store = inject(MonthlyTimeStore);
  private readonly classes = inject(ClassesStore);
  readonly requests = inject(RequestState);
  readonly isProfessor = inject(AuthService).user()?.perfil === 'professor';
  private readonly today = new Date();
  private readonly currentPeriod = this.periodKey(this.today.getMonth() + 1, this.today.getFullYear());
  readonly teacherId = signal('');
  readonly availableTeachers = computed(() =>
    [...new Set(this.records().map((row) => row.professorId))].sort((a, b) =>
      this.teacher(a).localeCompare(this.teacher(b), 'pt-BR'),
    ),
  );
  readonly filteredRecords = computed(() =>
    this.records().filter((row) => !this.teacherId() || row.professorId === this.teacherId()),
  );
  readonly records = this.store.records;
  readonly selectedPeriod = signal(this.currentPeriod);
  readonly showForm = signal(false);
  readonly periods = computed(() => {
    const all = new Map<string, { key: string; mes: number; ano: number }>();
    for (let mes = 1; mes <= this.today.getMonth() + 1; mes++) {
      const ano = this.today.getFullYear();
      const key = this.periodKey(mes, ano);
      all.set(key, { key, mes, ano });
    }
    for (const { mes, ano } of this.records()) {
      const key = this.periodKey(mes, ano);
      if (key <= this.currentPeriod) all.set(key, { key, mes, ano });
    }
    return orderByNumber([...all.values()], periodOrder);
  });
  readonly selectedRecords = computed(() =>
    this.filteredRecords().filter(
      (row) => this.periodKey(row.mes, row.ano) === this.selectedPeriod(),
    ),
  );
  readonly monthTitle = computed(() => {
    const period = this.periods().find(({ key }) => key === this.selectedPeriod());
    return period ? `${this.months[period.mes - 1]} de ${period.ano}` : '';
  });
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly canStartEntry = computed(() =>
    this.isProfessor &&
    !this.loading() &&
    !this.loadFailed() &&
    !this.records().some(({ mes, ano }) => this.periodKey(mes, ano) === this.currentPeriod),
  );
  readonly failed = signal(false);
  readonly message = signal('');
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
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('');
    this.failed.set(false);
    this.loadFailed.set(false);
    try {
      await this.store.load();
    } catch (error: unknown) {
      this.loadFailed.set(true);
      this.failed.set(true);
      this.message.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  get periodRegistered(): boolean {
    const { mes, ano } = this.form.getRawValue();
    return this.records().some((record) => record.mes === mes && record.ano === ano);
  }

  async save(): Promise<void> {
    if (
      !this.isProfessor ||
      this.loading() ||
      this.requests.saving() ||
      this.form.invalid ||
      this.periodRegistered
    )
      return;
    try {
      const saved = await this.store.save(this.form.getRawValue());
      const savedPeriod = this.periodKey(saved.mes, saved.ano);
      this.selectedPeriod.set(savedPeriod <= this.currentPeriod ? savedPeriod : this.currentPeriod);
      this.showForm.set(false);
      this.resetForm();
      this.failed.set(false);
      this.message.set('Lançamento de horas-aula salvo.');
    } catch (error: unknown) {
      this.failed.set(true);
      this.message.set(errorMessage(error));
    }
  }

  startEntry(): void {
    if (!this.canStartEntry()) return;
    this.resetForm();
    this.selectedPeriod.set(this.currentPeriod);
    this.showForm.set(true);
    this.message.set('');
    this.failed.set(false);
  }

  selectPeriod(mes: number, ano: number): void {
    this.selectedPeriod.set(this.periodKey(mes, ano));
    this.showForm.set(false);
    this.resetForm();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.resetForm();
    this.message.set('');
    this.failed.set(false);
  }

  private resetForm(): void {
    this.form.reset({
      mes: this.today.getMonth() + 1,
      ano: this.today.getFullYear(),
      totalHorasAula: 0,
    });
  }

  private periodKey(mes: number, ano: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  teacher(id: string): string {
    return this.classes.teachers.find((teacher) => teacher.id === id)?.nome ?? id;
  }

  formatHours(hours: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(hours);
  }
}
