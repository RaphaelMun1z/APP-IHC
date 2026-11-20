import type { ClassMeeting, Enrollment, SchoolClass, TeachingAssignment } from '../models/domain';
import type { Session } from '../models/domain';

export function classMeetings(group: SchoolClass): ClassMeeting[] {
  const meetings = group.horarios ??
    [...new Set(group.dias)].map((dia) => ({ dia, inicio: group.inicio, fim: group.fim }));
  return [...meetings].sort((a, b) => a.dia - b.dia);
}

export function validMeetingTime({ inicio, fim }: ClassMeeting): boolean {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  return time.test(inicio) && time.test(fim) && inicio < fim;
}

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
