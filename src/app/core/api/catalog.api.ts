import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from './api.config';
import type { CatalogDto, CatalogRegistration, ListResponse } from './contracts';
import type { MonthlyTimeRecord, Student } from '../models/domain';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  catalog() {
    return this.http.get<CatalogDto>(apiUrl(this.config.baseUrl, 'catalogo'));
  }
  students() {
    return this.http.get<ListResponse<Student>>(apiUrl(this.config.baseUrl, 'alunos'));
  }
  register(body: CatalogRegistration) {
    return this.http.post<CatalogDto>(apiUrl(this.config.baseUrl, 'catalogo'), body);
  }
  monthlyTime() {
    return this.http.get<ListResponse<MonthlyTimeRecord>>(apiUrl(this.config.baseUrl, 'pontos-mensais'));
  }
  saveMonthlyTime(body: Pick<MonthlyTimeRecord, 'mes' | 'ano' | 'totalHorasAula'>) {
    return this.http.put<MonthlyTimeRecord>(apiUrl(this.config.baseUrl, 'pontos-mensais'), body);
  }
}
