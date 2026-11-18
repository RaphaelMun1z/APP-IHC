import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../../core/api/api.config';
import type {
  ClassDto,
  ClassRequest,
  EnrollmentResponse,
  ListResponse,
  PinsDto,
  StudentRequest,
} from '../../core/api/contracts';
import type { Student } from '../../core/models/domain';

@Injectable({ providedIn: 'root' })
export class ClassesApi {
  private readonly http = inject(HttpClient);
  private readonly base = apiUrl(inject(API_CONFIG).baseUrl, 'turmas');
  list() {
    return this.http.get<ListResponse<ClassDto>>(this.base);
  }
  create(body: ClassRequest) {
    return this.http.post<ClassDto>(this.base, body);
  }
  update(id: string, body: ClassRequest) {
    return this.http.put<ClassDto>(`${this.base}/${encodeURIComponent(id)}`, body);
  }
  delete(ids: readonly string[]) {
    return this.http.delete<void>(this.base, { body: { ids } });
  }
  pins() {
    return this.http.get<PinsDto>(`${this.base}/fixadas`);
  }
  pin(id: string, fixada: boolean) {
    return this.http.patch<PinsDto>(`${this.base}/${encodeURIComponent(id)}/fixacao`, { fixada });
  }
  addStudent(id: string, body: StudentRequest) {
    return this.http.post<EnrollmentResponse>(
      `${this.base}/${encodeURIComponent(id)}/alunos`,
      body,
    );
  }
  renameStudent(id: string, studentId: string, body: StudentRequest) {
    return this.http.patch<Student>(
      `${this.base}/${encodeURIComponent(id)}/alunos/${encodeURIComponent(studentId)}`,
      body,
    );
  }
  removeStudent(id: string, studentId: string) {
    return this.http.delete<ClassDto>(
      `${this.base}/${encodeURIComponent(id)}/alunos/${encodeURIComponent(studentId)}`,
    );
  }
  assignTeachers(id: string, professorIds: readonly string[]) {
    return this.http.put<ClassDto>(`${this.base}/${encodeURIComponent(id)}/professores`, { professorIds });
  }
}
