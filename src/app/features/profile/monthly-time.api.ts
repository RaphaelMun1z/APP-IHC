import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../../core/api/api.config';
import type { ListResponse, MonthlyTimeRequest } from '../../core/api/contracts';
import type { MonthlyTimeRecord } from '../../core/models/domain';

@Injectable({ providedIn: 'root' })
export class MonthlyTimeApi {
  private readonly http = inject(HttpClient);
  private readonly url = apiUrl(inject(API_CONFIG).baseUrl, 'pontos-mensais');

  list() {
    return this.http.get<ListResponse<MonthlyTimeRecord>>(this.url);
  }

  create(body: MonthlyTimeRequest) {
    return this.http.post<MonthlyTimeRecord>(this.url, body);
  }
}
