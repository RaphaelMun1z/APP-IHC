import { Injectable, signal } from '@angular/core';
import { firstValueFrom, finalize } from 'rxjs';
import type { Observable } from 'rxjs';
import { ApiFailure } from './contracts';

@Injectable({ providedIn: 'root' })
export class RequestState {
  readonly pending = signal(0);
  readonly saving = signal(false);

  async mutate<T>(request: Observable<T>): Promise<T> {
    if (this.saving())
      throw new ApiFailure(409, {
        code: 'OPERATION_PENDING',
        message: 'Aguarde a operação em andamento.',
      });
    this.saving.set(true);
    return firstValueFrom(request.pipe(finalize(() => this.saving.set(false))));
  }
}
