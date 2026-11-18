import type { Enrollment, SchoolClass, TeachingAssignment } from '../models/domain';
import type { Session } from '../models/domain';

export function enrollments(group: SchoolClass): readonly Enrollment[] {
  return (
    group.matriculas ??
    [...new Set(group.alunoIds)].map((alunoId) => ({
      alunoId,
      turmaId: group.id,
      dataMatricula: null,
    }))
  );
}

export function teachingAssignments(group: SchoolClass): readonly TeachingAssignment[] {
  return group.leciona ?? [{ professorId: group.professorId, turmaId: group.id }];
}

export function teaches(group: SchoolClass | undefined, user: Session | null): boolean {
  return (
    !!group &&
    user?.perfil === 'professor' &&
    teachingAssignments(group).some(({ professorId }) => professorId === user.id)
  );
}
