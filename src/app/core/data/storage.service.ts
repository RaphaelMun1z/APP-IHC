import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { errorMessage } from '../../shared/utils/errors';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly version = signal(0);
  readonly revision = this.version.asReadonly();
  private readonly problems = signal<Readonly<Record<string, string>>>({});
  readonly errors = this.problems.asReadonly();
  private readonly refreshers = new Map<string, Set<() => void>>();

  // Root-scoped stores keep a signal snapshot; computed values never perform I/O.
  collection<T>(
    key: string,
    fallback: T,
    validate: (value: unknown) => value is T,
    normalize: (value: unknown) => unknown = (value) => value,
  ): Signal<T> {
    const state = signal(this.read(key, fallback, validate, normalize));
    const refresh = () => state.set(this.read(key, fallback, validate, normalize));
    const refreshers = this.refreshers.get(key) ?? new Set<() => void>();
    refreshers.add(refresh);
    this.refreshers.set(key, refreshers);
    return state.asReadonly();
  }

  read<T>(
    key: string,
    fallback: T,
    validate: (value: unknown) => value is T,
    normalize: (value: unknown) => unknown = (value) => value,
  ): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return structuredClone(fallback);
      const value: unknown = normalize(JSON.parse(raw));
      if (!validate(value)) throw new Error('Formato de dados inválido.');
      return value;
    } catch (error: unknown) {
      this.report(
        key,
        `Não foi possível ler ${key}. Os dados originais foram preservados. ${errorMessage(error)}`,
      );
      return structuredClone(fallback);
    }
  }

  initialize(key: string, value: unknown): void {
    try {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    } catch {
      this.report(
        key,
        'O armazenamento do navegador está indisponível. Não foi possível inicializar os dados demonstrativos.',
      );
    }
  }

  write(key: string, value: unknown): void {
    this.writeMany([[key, value]]);
  }

  writeMany(entries: readonly (readonly [string, unknown])[]): void {
    if (this.problems()['rollback'] || entries.some(([key]) => this.problems()[key]))
      throw new Error(
        'Não foi possível salvar: existem dados locais inválidos ou indisponíveis. Preserve os dados e verifique o armazenamento do navegador.',
      );
    const previous = new Map<string, string | null>();
    const written: string[] = [];
    try {
      for (const [key] of entries) previous.set(key, localStorage.getItem(key));
      for (const [key, value] of entries) {
        localStorage.setItem(key, JSON.stringify(value));
        written.push(key);
      }
    } catch {
      try {
        for (const key of written.reverse()) {
          const value = previous.get(key) ?? null;
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        }
      } catch {
        this.report(
          'rollback',
          'Não foi possível restaurar todos os dados após a falha de gravação. Verifique o armazenamento antes de continuar.',
        );
      }
      throw new Error(
        'Não foi possível salvar. Verifique se o armazenamento do navegador está disponível e tente novamente.',
      );
    }
    this.version.update((value) => value + 1);
    for (const [key] of entries) for (const refresh of this.refreshers.get(key) ?? []) refresh();
  }

  private report(key: string, message: string): void {
    this.problems.update((errors) => ({ ...errors, [key]: message }));
  }
}
