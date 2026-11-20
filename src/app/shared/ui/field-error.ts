import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';

@Pipe({ name: 'fieldError' })
export class FieldError implements PipeTransform {
  transform(errors: ValidationErrors | null): string {
    if (!errors) return '';
    if (errors['required']) return 'Preencha este campo.';
    if (errors['email']) return 'Informe um e-mail válido.';
    if (errors['maxlength']) return `Use até ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['min']) return `Informe um valor a partir de ${errors['min'].min}.`;
    if (errors['max']) return `Informe um valor de até ${errors['max'].max}.`;
    return 'Confira o valor informado.';
  }
}
