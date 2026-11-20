import { requiredText } from '../../shared/utils/form-validators';
import { Action } from '../../shared/ui/action';
import { contextParam, returnTo } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClassesStore } from '../classes/classes.store';
import { AuthService } from '../../core/auth/auth.service';
import type { UnsavedChanges } from '../../core/navigation/unsaved-changes';
import { Feedback } from '../../shared/ui/feedback';
import { errorMessage, toggleValue } from '../../shared/utils/errors';
import { weekdays } from '../../shared/utils/dates';
import { classMeetings, validMeetingTime } from '../../core/data/academic-records';
import type { ClassMeeting } from '../../core/models/domain';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog';
@Component({
  selector: 'app-class-editor',
  imports: [Action, ReactiveFormsModule, RouterLink, Feedback],
  templateUrl: './class-editor.html',
  styleUrl: './class-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassEditor implements UnsavedChanges {
  readonly classes = inject(ClassesStore);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly classId = contextParam(inject(ActivatedRoute).snapshot, 'turma');
  readonly back = returnTo(
    inject(ActivatedRoute).snapshot,
    this.classId ? `/turmas/${this.classId}/visao-geral` : '/turmas',
  );
  readonly existing = this.classId ? this.classes.get(this.classId) : undefined;
  readonly pickProfessor = this.auth.user()?.perfil === 'coordenacao' && !this.existing;
  readonly unavailable = !!this.classId && !this.existing;
  readonly steps = [
    { title: 'Dados da turma', description: 'Identificação e conteúdo' },
    { title: 'Horários', description: 'Dias e horário dos encontros' },
    { title: 'Alunos', description: 'Matrículas e situação da turma' },
  ];
  readonly step = signal(0);
  readonly furthestStep = signal(0);
  readonly form = inject(FormBuilder).nonNullable.group({
    nome: [this.existing?.nome ?? '', requiredText(60)],
    cursoId: [this.existing?.cursoId ?? '', Validators.required],
    moduloId: [this.existing?.moduloId ?? '', Validators.required],
    professorId: [this.existing?.professorId ?? (this.pickProfessor ? '' : this.auth.user()?.id ?? ''), Validators.required],
    faixaEtaria: [this.existing?.faixaEtaria ?? '', requiredText(100)],
    modalidade: [this.existing?.modalidade ?? '', requiredText(100)],
    ativa: this.existing?.ativa ?? true,
  });
  readonly meetings = signal<ClassMeeting[]>(this.existing ? classMeetings(this.existing) : []);
  readonly selectedDays = computed(() => this.meetings().map(({ dia }) => dia));
  readonly validSchedule = computed(() => this.meetings().length > 0 && this.meetings().every(validMeetingTime));
  readonly students = signal<readonly string[]>(this.existing?.alunoIds ?? []);
  private readonly selectionDirty = signal(false);
  readonly weekdays = weekdays;
  readonly message = signal('');
  modules() {
    return this.classes.course(this.form.controls.cursoId.value)?.modulos ?? [];
  }
  hasUnsavedChanges(): boolean {
    return this.form.dirty || this.selectionDirty();
  }
  selectCourse(): void {
    this.form.controls.moduloId.setValue('');
  }
  canAdvance(): boolean {
    if (this.step() === 0) {
      return (
        this.form.controls.nome.valid &&
        this.form.controls.cursoId.valid &&
        this.form.controls.moduloId.valid &&
        this.form.controls.professorId.valid &&
        this.form.controls.faixaEtaria.valid &&
        this.form.controls.modalidade.valid
      );
    }
    if (this.step() === 1) {
      return this.validSchedule();
    }
    return false;
  }
  toggleDay(day: number): void {
    this.meetings.update((meetings) =>
      this.selectedDays().includes(day)
        ? meetings.filter(({ dia }) => dia !== day)
        : [...meetings, { dia: day, inicio: '08:00', fim: '08:50' }].sort((a, b) => a.dia - b.dia),
    );
    this.selectionDirty.set(true);
  }
  setTime(day: number, field: 'inicio' | 'fim', value: string): void {
    this.meetings.update((meetings) => meetings.map((meeting) =>
      meeting.dia === day ? { ...meeting, [field]: value } : meeting,
    ));
    this.selectionDirty.set(true);
  }
  toggleStudent(id: string): void {
    this.students.update((values) => toggleValue(values, id));
    this.selectionDirty.set(true);
  }
  toggleAll(): void {
    this.students.set(
      this.students().length === this.classes.students.length
        ? []
        : this.classes.students.map((student) => student.id),
    );
    this.selectionDirty.set(true);
  }
  goToStep(index: number): void {
    if (index >= 0 && index <= this.furthestStep()) {
      this.step.set(index);
      this.message.set('');
    }
  }
  next(): void {
    if (this.step() === 0) {
      const controls = [
        this.form.controls.nome,
        this.form.controls.cursoId,
        this.form.controls.moduloId,
        this.form.controls.professorId,
        this.form.controls.faixaEtaria,
        this.form.controls.modalidade,
      ];
      controls.forEach((control) => control.markAsTouched());
      if (controls.some((control) => control.invalid)) {
        this.message.set('Preencha os dados obrigatórios da turma antes de continuar.');
        return;
      }
    }
    if (this.step() === 1 && !this.validSchedule()) {
      this.message.set('Selecione um dia e informe um intervalo válido em cada dia de aula.');
      return;
    }
    this.message.set('');
    this.step.update((current) => Math.min(this.steps.length - 1, current + 1));
    this.furthestStep.update((furthest) => Math.max(furthest, this.step()));
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Preencha os dados obrigatórios da turma.');
      return;
    }
    if (!this.validSchedule()) {
      this.message.set('Selecione um dia e informe um intervalo válido em cada dia de aula.');
      this.step.set(1);
      return;
    }
    if (!this.students().length) {
      this.message.set('Selecione pelo menos um aluno.');
      this.step.set(2);
      return;
    }
    try {
      if (
        this.existing?.ativa &&
        !this.form.controls.ativa.value &&
        !(await this.confirm.confirm('Os registros serão preservados e ficarão disponíveis para consulta.', {
          title: 'Arquivar esta turma?',
          confirmLabel: 'Arquivar',
          confirmIcon: 'archive',
        }))
      ) return;
      const saved = await this.classes.save({
        ...this.form.getRawValue(),
        id: this.existing?.id ?? '',
        dias: this.selectedDays(),
        horarios: this.meetings(),
        inicio: this.meetings()[0].inicio,
        fim: this.meetings()[0].fim,
        alunoIds: this.students(),
      });
      this.form.markAsPristine();
      this.selectionDirty.set(false);
      void this.router.navigateByUrl(
        this.existing ? this.back : `/turmas/${saved.id}/visao-geral?retorno=%2Fturmas`,
      );
    } catch (error: unknown) {
      this.message.set(errorMessage(error));
    }
  }
  readonly backLink = inject(Router).parseUrl(this.back);
}
