import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { ApiConfiguration } from '../../../environments/environment';

export const API_CONFIG = new InjectionToken<ApiConfiguration>('API_CONFIG', {
  providedIn: 'root',
  factory: () => environment.api,
});

export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
