import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../../core/api/api.config';
import type {
  LessonDto,
  LessonRequest,
  LessonFilters,
  ListResponse,
} from '../../core/api/contracts';

@Injectable({ providedIn: 'root' })
export class LessonsApi {
  private readonly http = inject(HttpClient);
  private readonly base = apiUrl(inject(API_CONFIG).baseUrl, 'aulas');
  list(filters: LessonFilters = {}) {
    return this.http.get<ListResponse<LessonDto>>(this.base, {
      params: filters.turmaId ? { turmaId: filters.turmaId } : {},
    });
  }
  create(body: LessonRequest) {
    return this.http.post<LessonDto>(this.base, body);
  }
  update(id: string, body: LessonRequest) {
    return this.http.put<LessonDto>(`${this.base}/${encodeURIComponent(id)}`, body);
  }
}
