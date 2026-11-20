import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RequestState } from '../../core/api/request-state';
import type { MonthlyTimeRequest, SortOrder } from '../../core/api/contracts';
import type { MonthlyTimeRecord } from '../../core/models/domain';
import { orderByNumber } from '../../shared/utils/collections';
import { MonthlyTimeApi } from './monthly-time.api';

export const periodOrder: readonly SortOrder<'ano' | 'mes'>[] = [
  { field: 'ano', direction: 'desc' },
  { field: 'mes', direction: 'desc' },
];

@Injectable()
export class MonthlyTimeStore {
  private readonly api = inject(MonthlyTimeApi);
  private readonly requests = inject(RequestState);
  private readonly entries = signal<readonly MonthlyTimeRecord[]>([]);
  readonly records = this.entries.asReadonly();

  async load(): Promise<void> {
    const { items } = await firstValueFrom(this.api.list());
    this.entries.set(orderByNumber(items, periodOrder));
  }

  async save(body: MonthlyTimeRequest): Promise<MonthlyTimeRecord> {
    const saved = await this.requests.mutate(this.api.create(body));
    this.entries.update((items) => orderByNumber([...items, saved], periodOrder));
    return saved;
  }
}
