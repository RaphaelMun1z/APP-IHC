import { Injectable, computed, inject } from '@angular/core';
import type { Assessment, AttendanceDay, Lesson } from '../../core/models/domain';
import { LessonsStore } from '../lessons/lessons.store';
import { AttendanceStore } from '../attendance/attendance.store';
import { AssessmentsStore } from '../assessments/assessments.store';

interface RecordBase {
  readonly id: string;
  readonly turmaId: string;
  readonly data: string;
  readonly titulo: string;
  readonly resumo: string;
}
export type HistoryRecord = RecordBase &
  (
    | { readonly tipo: 'aula'; readonly registro: Lesson }
    | { readonly tipo: 'frequencia'; readonly registro: AttendanceDay }
    | { readonly tipo: 'avaliacao'; readonly registro: Assessment }
  );
export interface HistoryFilters {
  readonly turmaId: string;
  readonly tipo: string;
  readonly inicio: string;
  readonly fim: string;
  readonly conteudo: string;
}
export function filterHistory(
  records: readonly HistoryRecord[],
  filters: HistoryFilters,
): readonly HistoryRecord[] {
  if (filters.inicio && filters.fim && filters.inicio > filters.fim)
    throw new Error('A data final deve ser igual ou posterior à data inicial.');
  const query = filters.conteudo.trim().toLocaleLowerCase('pt-BR');
  return records.filter(
    (record) =>
      (!filters.turmaId || record.turmaId === filters.turmaId) &&
      (!filters.tipo || record.tipo === filters.tipo) &&
      (!filters.inicio || record.data >= filters.inicio) &&
      (!filters.fim || record.data <= filters.fim) &&
      (!query ||
        `${record.resumo} ${record.tipo === 'aula' ? record.registro.notas : ''}`
          .toLocaleLowerCase('pt-BR')
          .includes(query)),
  );
}
@Injectable({ providedIn: 'root' })
export class HistoryStore {
  private readonly lessons = inject(LessonsStore);
  private readonly attendance = inject(AttendanceStore);
  private readonly assessments = inject(AssessmentsStore);
  readonly records = computed<readonly HistoryRecord[]>(() => {
    const result: HistoryRecord[] = this.lessons.records().map((lesson) => ({
      id: lesson.id,
      tipo: 'aula',
      turmaId: lesson.turmaId,
      data: lesson.data,
      titulo: 'Registro de aula',
      resumo: lesson.licoes.join(' · '),
      registro: lesson,
    }));
    for (const [turmaId, dates] of Object.entries(this.attendance.records()))
      for (const [data, marks] of Object.entries(dates)) {
        const present = Object.values(marks).filter((mark) => mark === 'presente').length;
        const absent = Object.values(marks).filter((mark) => mark === 'falta').length;
        if (present + absent)
          result.push({
            id: `frequencia-${turmaId}-${data}`,
            tipo: 'frequencia',
            turmaId,
            data,
            titulo: 'Frequência',
            resumo: `${present} presentes · ${absent} faltas`,
            registro: marks,
          });
      }
    for (const value of Object.values(this.assessments.records())) {
      const lesson = this.lessons.records().find((item) => item.id === value.lessonId);
      if (!lesson) continue;
      const marks = value.alunos.flatMap((student) => Object.values(student.avaliacoes));
      result.push({
        id: `avaliacao-${lesson.turmaId}-${lesson.data}`,
        tipo: 'avaliacao',
        turmaId: lesson.turmaId,
        data: lesson.data,
        titulo: 'Avaliação observacional',
        resumo: `${marks.filter((mark) => mark === 'ok').length} OK · ${marks.filter((mark) => mark === 'nao-ok').length} Não OK`,
        registro: value,
      });
    }
    return result.sort((a, b) => b.data.localeCompare(a.data) || a.titulo.localeCompare(b.titulo));
  });
}
