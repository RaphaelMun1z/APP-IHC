import { Validators } from '@angular/forms';

export function requiredText(maxLength: number) {
  return [Validators.required, Validators.pattern(/\S/), Validators.maxLength(maxLength)];
}
