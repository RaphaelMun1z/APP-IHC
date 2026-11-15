import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG, apiUrl } from '../api/api.config';
import type { LoginRequest, SessionDto } from '../api/contracts';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = apiUrl(inject(API_CONFIG).baseUrl, 'auth/session');
  login(body: LoginRequest) {
    return this.http.post<SessionDto>(this.url, body);
  }
  session() {
    return this.http.get<SessionDto>(this.url);
  }
  logout() {
    return this.http.delete<void>(this.url);
  }
}
