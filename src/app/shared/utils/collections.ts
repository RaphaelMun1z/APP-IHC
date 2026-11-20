import type { PageRequest, SortOrder } from '../../core/api/contracts';

export function pageItems<T>(items: readonly T[], { page, pageSize }: PageRequest): readonly T[] {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}

export function orderByNumber<Field extends string, T extends Record<Field, number>>(
  items: readonly T[],
  order: readonly SortOrder<Field>[],
): T[] {
  return [...items].sort((left, right) => {
    for (const { field, direction } of order) {
      const difference = left[field] - right[field];
      if (difference) return direction === 'asc' ? difference : -difference;
    }
    return 0;
  });
}
