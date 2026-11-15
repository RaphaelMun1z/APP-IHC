import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../../core/api/api.config';
import type { AssessmentDto, AssessmentRequest, AssessmentsDto } from '../../core/api/contracts';

@Injectable({ providedIn: 'root' })
export class AssessmentsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  list() {
    return this.http.get<AssessmentsDto>(apiUrl(this.config.baseUrl, 'avaliacoes'));
  }
  save(lessonId: string, body: AssessmentRequest) {
    return this.http.put<AssessmentDto>(
      apiUrl(this.config.baseUrl, `aulas/${encodeURIComponent(lessonId)}/avaliacao`),
      body,
    );
  }
}
