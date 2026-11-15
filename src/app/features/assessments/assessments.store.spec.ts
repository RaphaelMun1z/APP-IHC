import { provideMockApi } from '../../core/api/api-test.providers';
import { BootstrapService } from '../../core/api/bootstrap.service';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { initializeDemoData } from '../../core/data/demo-data';
import { storageKeys } from '../../core/data/storage-keys';
import { StorageService } from '../../core/data/storage.service';
import { isAssessments, isLegacyAssessments } from '../../core/data/validators';
import type { AssessmentData, LegacyAssessmentData } from '../../core/models/domain';
import { AssessmentsStore } from './assessments.store';

describe('Vínculo de avaliações às aulas', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMockApi()] });
    initializeDemoData(TestBed.inject(StorageService));
    await TestBed.inject(AuthService).login('professor', 'ipb123', false);
  });

  it('migra avaliações com aula correspondente e preserva as que não têm aula', async () => {
    const storage = TestBed.inject(StorageService);
    const legacy = storage.read<LegacyAssessmentData>(
      storageKeys.assessments,
      {},
      isLegacyAssessments,
    );
    const sourceDate = Object.keys(legacy['6a'])[0];
    const orphanDate = '2026-01-01';
    const orphan = legacy['6a'][sourceDate];
    storage.write(storageKeys.assessments, {
      ...legacy,
      '6a': { ...legacy['6a'], [orphanDate]: orphan },
    });

    await firstValueFrom(TestBed.inject(BootstrapService).load());
    const assessments = TestBed.inject(AssessmentsStore);
    const migrated = storage.read<AssessmentData>(storageKeys.lessonAssessments, {}, isAssessments);
    const remaining = storage.read<LegacyAssessmentData>(
      storageKeys.assessments,
      {},
      isLegacyAssessments,
    );

    expect(migrated['demo-aula-6a']?.lessonId).toBe('demo-aula-6a');
    expect(remaining['6a'][orphanDate]).toEqual(orphan);
    expect(assessments.unlinkedLegacy()).toContainEqual({
      classId: '6a',
      date: orphanDate,
      assessment: orphan,
    });
  });
});
