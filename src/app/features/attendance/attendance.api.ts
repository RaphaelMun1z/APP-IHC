import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../../core/api/api.config';
import type { AttendanceDto, AttendanceRequest, ListResponse } from '../../core/api/contracts';

@Injectable({ providedIn: 'root' })
export class AttendanceApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  list() {
    return this.http.get<ListResponse<AttendanceDto>>(apiUrl(this.config.baseUrl, 'frequencias'));
  }
  save(classId: string, body: AttendanceRequest) {
    return this.http.patch<AttendanceDto>(
      apiUrl(this.config.baseUrl, `turmas/${encodeURIComponent(classId)}/frequencias`),
      body,
    );
  }
}
