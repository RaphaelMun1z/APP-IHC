import { Injectable, inject } from '@angular/core';
import { courses, criteria, demoCoordinator, teachers } from '../../data/catalog';
import { storageKeys } from '../../data/storage-keys';
import { StorageService } from '../../data/storage.service';
import type { Coordinator, Course, Teacher } from '../../models/domain';
import { ApiFailure } from '../contracts';
import { MockSession } from './mock-session';

interface CatalogRecords {
  readonly coordenadores: readonly Coordinator[];
  readonly professores: readonly Teacher[];
  readonly cursos: readonly Course[];
}

function isCatalog(value: unknown): value is CatalogRecords {
  const catalog = value as CatalogRecords | null;
  const person = (item: unknown): boolean => {
    const row = item as { id?: unknown; nome?: unknown } | null;
    return typeof row?.id === 'string' && typeof row.nome === 'string';
  };
  return (
    !!catalog &&
    Array.isArray(catalog.coordenadores) &&
    catalog.coordenadores.every(person) &&
    Array.isArray(catalog.professores) &&
    catalog.professores.every(person) &&
    Array.isArray(catalog.cursos) &&
    catalog.cursos.every(
      (course: Course) =>
        person(course) &&
        Array.isArray(course.modulos) &&
        course.modulos.every(
          (module) =>
            person(module) && Array.isArray(module.licoes) && (module.curriculo === undefined || Array.isArray(module.curriculo)),
        ),
    )
  );
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 150)
    throw new Error('Preencha os campos obrigatórios com até 150 caracteres.');
  return value.trim();
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error('Informe um número inteiro positivo.');
  return value;
}

@Injectable({ providedIn: 'root' })
export class MockCatalogRepository {
  private readonly auth = inject(MockSession);
  private readonly storage = inject(StorageService);
  readonly records = this.storage.collection<CatalogRecords>(
    storageKeys.catalog,
    { coordenadores: [demoCoordinator], professores: teachers, cursos: courses },
    isCatalog,
  );

  snapshot() {
    return { ...this.records(), criterios: criteria };
  }

  requireCoordinator(): string {
    const user = this.auth.user();
    if (
      user?.perfil !== 'coordenacao' ||
      !this.records().coordenadores.some(({ id }) => id === user.id)
    )
      throw new ApiFailure(403, {
        code: 'FORBIDDEN',
        message: 'Ação reservada à coordenação pedagógica.',
      });
    return user.id;
  }

  coordinatorForNewRecord(): string {
    const user = this.auth.user();
    return user?.perfil === 'coordenacao' ? this.requireCoordinator() : demoCoordinator.id;
  }

  register(input: Record<string, unknown>) {
    const coordenadorId = this.requireCoordinator();
    const catalog = this.records();
    const id = crypto.randomUUID();
    switch (input['tipo']) {
      case 'professor':
      case 'coordenador': {
        const nome = requiredText(input['nome']);
        const cpf = requiredText(input['cpf']).replace(/[.\s-]/g, '');
        const email = requiredText(input['email']).toLowerCase();
        if (!/^\d{11}$/.test(cpf) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new Error('Informe um CPF com 11 dígitos e um e-mail válido.');
        const key = input['tipo'] === 'professor' ? 'professores' : 'coordenadores';
        if (catalog[key].some((person) => person.cpf === cpf || person.email === email))
          throw new Error('Já existe um cadastro com esse CPF ou e-mail.');
        const person = { id, nome, cpf, email };
        const row =
          key === 'professores' ? { ...person, telefone: requiredText(input['telefone']) } : person;
        this.storage.write(storageKeys.catalog, { ...catalog, [key]: [...catalog[key], row] });
        break;
      }
      case 'curso': {
        const course: Course = {
          id,
          coordenadorId,
          nome: requiredText(input['nome']),
          area: requiredText(input['area']),
          cargaHorariaTotal: positiveInteger(input['cargaHorariaTotal']),
          modulos: [],
        };
        this.storage.write(storageKeys.catalog, {
          ...catalog,
          cursos: [...catalog.cursos, course],
        });
        break;
      }
      case 'modulo':
      case 'licao': {
        const course = catalog.cursos.find(({ id }) => id === input['cursoId']);
        if (!course) throw new Error('Curso não encontrado.');
        const numero = positiveInteger(input['numero']);
        let modulos = course.modulos;
        if (input['tipo'] === 'modulo') {
          if (modulos.some((module) => module.numero === numero))
            throw new Error('Já existe um módulo com esse número no curso.');
          modulos = [
            ...modulos,
            {
              id,
              cursoId: course.id,
              numero,
              nome: requiredText(input['nome']),
              licoes: [],
              curriculo: [],
            },
          ];
        } else {
          const module = modulos.find(({ id }) => id === input['moduloId']);
          if (!module) throw new Error('Módulo não encontrado no curso.');
          const titulo = requiredText(input['titulo']);
          if (
            module.curriculo?.some((lesson) => lesson.numero === numero) ||
            module.licoes.includes(titulo)
          )
            throw new Error('Já existe uma lição com esse número ou título no módulo.');
          const lesson = { id, moduloId: module.id, coordenadorId, numero, titulo };
          modulos = modulos.map((row) =>
            row.id === module.id
              ? {
                  ...row,
                  curriculo: [...(row.curriculo ?? []), lesson],
                  licoes: [...row.licoes, titulo],
                }
              : row,
          );
        }
        this.storage.write(storageKeys.catalog, {
          ...catalog,
          cursos: catalog.cursos.map((row) => (row.id === course.id ? { ...row, modulos } : row)),
        });
        break;
      }
      default:
        throw new Error('Selecione um tipo de cadastro pedagógico.');
    }
    return this.snapshot();
  }
}
