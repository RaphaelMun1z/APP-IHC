import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from './api.config';
import type { CatalogDto, ListResponse } from './contracts';
import type { Student } from '../models/domain';

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
}
