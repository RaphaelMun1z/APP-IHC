import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { API_CONFIG } from './api.config';
import { apiInterceptor, mockInterceptor } from './api.interceptors';
import type { ApiConfiguration } from '../../../environments/environment';

export const testApiConfig: ApiConfiguration = {
  mode: 'mock',
  baseUrl: '/api/v1',
  timeoutMs: 1000,
  mock: { latencyMs: 0, failureStatus: null },
};
export function provideMockApi() {
  return [
    provideHttpClient(withInterceptors([apiInterceptor, mockInterceptor])),
    { provide: API_CONFIG, useValue: testApiConfig },
  ];
}
