import { navigationUrl } from '../../core/navigation/context';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HistoryStore } from './history.store';
import { RecordDetails } from './record-details';
import { contextParam } from '../../core/navigation/context';

@Component({
  selector: 'app-record-page',
  imports: [RecordDetails],
  template: `<main class="app-page surface content-scroll record-page">
    @if (record(); as item) {
      <app-record-details
        [record]="item"
        [returnUrl]="currentUrl"
        [showLessonTabs]="!nestedLessonContext"
      />
    } @else {
      <p>O registro não existe ou não pertence a esta turma.</p>
    }
  </main>`,
  styleUrl: './record-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPage {
  private readonly route = inject(ActivatedRoute);
  private readonly history = inject(HistoryStore);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly parentParams = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });
  readonly contextual = !!contextParam(this.route.snapshot, 'turma');
  readonly nestedLessonContext = this.route.parent?.snapshot.routeConfig?.path === 'registros/:id';
  readonly currentUrl = navigationUrl(inject(Router));
  private readonly recordId = computed(
    () => this.params().get('id') ?? this.parentParams().get('id'),
  );
  readonly record = computed(() =>
    this.history
      .records()
      .find(
        (item) =>
          item.id === this.recordId() &&
          (!this.contextual || item.turmaId === contextParam(this.route.snapshot, 'turma')),
      ),
  );
}
