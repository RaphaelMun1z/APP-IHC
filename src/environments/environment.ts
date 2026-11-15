export interface ApiConfiguration {
  readonly mode: 'mock' | 'api';
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly mock: {
    readonly latencyMs: number;
    readonly failureStatus: 0 | 500 | 503 | null;
  };
}

// The same configuration is used by development, production and GitHub Pages.
// Change mode to 'api' and configure baseUrl when connecting the backend.
export const environment: { readonly api: ApiConfiguration } = {
  api: {
    mode: 'mock',
    baseUrl: '/api/v1',
    timeoutMs: 15000,
    mock: { latencyMs: 250, failureStatus: null },
  },
};
