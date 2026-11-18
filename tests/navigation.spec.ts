import { openFilters } from './filter-helpers';
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role = 'professor') {
  await page.clock.install({ time: new Date('2026-11-13T12:00:00-03:00') });
  await page.goto('/login');
  await openFilters(page);
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/turmas$/);
}
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('professor percorre turma, salva aula, consulta detalhes e edita pelo histórico', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('searchbox').fill('Ciência da Computação · 3º período A');
  await page
    .getByRole('link', { name: 'Abrir Ciência da Computação · 3º período A', exact: true })
    .click();
  await expect(page).toHaveURL(/\/turmas\/6a\/visao-geral/);
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Aulas', exact: true })
    .click();
  await page.getByRole('link', { name: 'Registrar aula', exact: true }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page
    .locator('.form-wizard-option')
    .filter({ hasText: 'Requisitos funcionais e não funcionais' })
    .click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Registro contextual');
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page).toHaveURL(/\/turmas\/6a\/registros\//);
  await expect(page.getByRole('main')).toContainText('Registro contextual');
  const recordUrl = page.url();
  await expect.poll(async () => {
    const lesson = await page.locator('main.record-page').boundingBox();
    const view = await page.locator('.page-view').boundingBox();
    return Math.abs(lesson!.y + lesson!.height - view!.y - view!.height);
  }).toBeLessThanOrEqual(1);
  await page.goto('/turmas/6a/aulas?conteudo=Requisitos');
  await openFilters(page);
  await expect(page.locator('.lessons-table tbody')).toContainText(
    'Requisitos funcionais e não funcionais',
  );
  await expect(page.getByRole('link', { name: /Abrir registro de/ }).first()).toBeVisible();
  const detailUrl = new URL(recordUrl);
  detailUrl.searchParams.set(
    'retorno',
    `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
  );
  await page.goto(detailUrl.toString());
  await page.getByRole('link', { name: 'Editar registro', exact: true }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Registro contextual revisado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('main')).toContainText('Registro contextual revisado');
  await expect(page).toHaveURL(/\/turmas\/6a\/registros\/[^?]+\?retorno=/);
  const backLink = page.getByRole('link', { name: 'Voltar', exact: true });
  await expect(backLink).toHaveAttribute('href', /\/turmas\/6a\/aulas\?/);
  await backLink.click();
  await expect(page).toHaveURL(/\/turmas\/6a\/aulas\?/);
  await openFilters(page);
  await expect(page.getByLabel('Conteúdo da aula')).toHaveValue('Requisitos');
  await page.goto('/registro-aula');
  await openFilters(page);
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page
    .locator('.form-wizard-option')
    .filter({ hasText: 'Requisitos funcionais e não funcionais' })
    .click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe uma aula nesta data');
});

test('professor cria turma, gerencia e confirma arquivamento e reativação', async ({ page }) => {
  await login(page);
  await page.goto('/turmas');
  await openFilters(page);
  await page.getByRole('link', { name: 'Nova turma' }).click();
  await page.getByLabel('Nome da turma').fill('8º ano Angular');
  await page.getByLabel('Faixa etária').fill('Adultos');
  await page.getByLabel('Modalidade').fill('Presencial');
  await page.locator('.form-wizard-option').filter({ hasText: 'Ciência da Computação' }).click();
  await page.locator('.form-wizard-option').filter({ hasText: 'Engenharia de Software' }).click();
  const wizard = page.locator('.form-wizard');
  await expect(wizard).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('.form-wizard-panel:visible .form-wizard-field-stack')).toHaveCSS(
    'row-gap',
    '24px',
  );
  await expect(page.locator('.form-wizard-option:has(input:checked)').first()).toHaveCSS(
    'background-color',
    'rgb(15, 23, 42)',
  );
  await expect(page.locator('.form-wizard-option:has(input:checked)').first()).toHaveCSS(
    'color',
    'rgb(248, 250, 252)',
  );
  await expect(page.locator('.form-wizard-option:has(input:checked)').first()).toHaveCSS(
    'flex-grow',
    '0',
  );
  await expect(page.locator('.form-wizard-field-stack > .field').first()).toHaveCSS(
    'text-align',
    'center',
  );
  const firstLegend = page.locator('.form-wizard-panel:visible legend').first();
  await expect(firstLegend).toHaveCSS('text-align', 'center');
  const legendBox = await firstLegend.boundingBox();
  const fieldsetBox = await firstLegend.locator('..').boundingBox();
  expect(
    Math.abs(legendBox!.x + legendBox!.width / 2 - (fieldsetBox!.x + fieldsetBox!.width / 2)),
  ).toBeLessThanOrEqual(1);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const steps = page.getByRole('navigation', { name: 'Etapas do formulário' }).getByRole('button');
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
  const continueButton = page.getByRole('button', { name: 'Próxima etapa' });
  const content = page.locator('.form-wizard-content');
  const continueBox = await continueButton.boundingBox();
  const contentBox = await content.boundingBox();
  const panelBox = await page.locator('.form-wizard-panel:visible').boundingBox();
  expect(panelBox!.y - contentBox!.y).toBeLessThan(80);
  expect(
    Math.abs(continueBox!.x + continueBox!.width / 2 - (contentBox!.x + contentBox!.width / 2)),
  ).toBeLessThanOrEqual(1);
  const timelineMarkerBox = await steps.nth(1).locator('.form-wizard-step-number').boundingBox();
  expect(timelineMarkerBox!.width).toBeGreaterThanOrEqual(28);
  const backBox = await page.getByRole('button', { name: 'Voltar', exact: true }).boundingBox();
  expect(backBox!.y).toBeGreaterThan(continueBox!.y + continueBox!.height);
  await page.locator('.form-wizard-option').filter({ hasText: 'Seg' }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/turmas\/[^/]+\/visao-geral/);
  const createdClassUrl = page.url();
  await expect(page.getByRole('main')).toContainText('Mariana Oliveira');
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Alunos', exact: true })
    .click();
  const editClassLink = page.getByRole('banner').getByRole('link', {
    name: 'Editar turma',
    exact: true,
  });
  await editClassLink.click();
  await expect(editClassLink).toHaveCount(0);
  await expect(page.getByLabel('Nome da turma')).toHaveValue('8º ano Angular');
  await page.getByLabel('Nome da turma').fill('8º ano Angular atualizado');
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/turmas$/);
  await page.goto(createdClassUrl);
  await expect(page.getByRole('main')).toContainText('matriculados');
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Visão geral', exact: true })
    .click();
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Arquivar turma', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /^(Descartar|Arquivar|Reativar|Excluir|Confirmar)$/ })
    .click();
  await expect(page.getByRole('button', { name: 'Reativar turma', exact: true })).toBeVisible();
  await page.reload();
  await openFilters(page);
  await expect(page.getByRole('button', { name: 'Reativar turma', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Aulas', exact: true })
    .click();
  await expect(page.getByRole('link', { name: 'Registrar aula', exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Visão geral', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reativar turma', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /^(Descartar|Arquivar|Reativar|Excluir|Confirmar)$/ })
    .click();
  await expect(page.getByRole('button', { name: 'Arquivar turma', exact: true })).toBeVisible();
  await page.goto('/turmas?busca=Angular&professor=professor-02&situacao=todas');
  await openFilters(page);
  await page.getByRole('link', { name: /^Abrir / }).click();
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await openFilters(page);
  await expect(page.getByLabel('Buscar turma')).toHaveValue('Angular');
  await expect(page.getByRole('searchbox')).toHaveValue('Angular');
});

test('URLs diretas permitem gestão ao professor e preservam retorno após login', async ({
  page,
}) => {
  await page.goto('/turmas/6a/alunos');
  await openFilters(page);
  await expect(page).toHaveURL(/\/login\?retorno=/);
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/turmas\/6a\/alunos$/);
  await page.goto('/turmas/7a/aulas');
  await openFilters(page);
  await expect(page).toHaveURL(/\/turmas\/7a\/aulas$/);
  await page.goto('/turmas/6a/gerenciar');
  await openFilters(page);
  await expect(page).toHaveURL(/\/turmas\/6a\/gerenciar$/);
  await page.goto('/historico/demo-aula-7a');
  await openFilters(page);
  await expect(page.getByRole('main')).toContainText('Administração · 2º período A');
  await page.goto('/turmas/6a/registros/demo-aula-7a');
  await openFilters(page);
  await expect(page.getByRole('heading', { name: 'Registro indisponível' })).toBeVisible();
});

test('abas protegem alterações e frequência e avaliações persistem no contexto', async ({
  page,
}) => {
  await login(page);
  await page.goto('/turmas/6a/frequencia?data=2026-11-09');
  await openFilters(page);
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0);
  const pastDate = '2026-11-09';
  await page.getByRole('button', { name: `Editar chamada de ${pastDate}` }).click();
  const mark = page.getByRole('button', { name: new RegExp(`Ana Clara Santos, ${pastDate}:`) });
  const originalMark = await mark.textContent();
  await mark.click();
  await expect(mark).not.toHaveText(originalMark ?? '');
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible();
  const changed = await mark.textContent();
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Aulas', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(page).toHaveURL(/frequencia/);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await openFilters(page);
  await expect(mark).toHaveText(changed ?? '');
  await page.getByRole('combobox', { name: 'Mês', exact: true }).selectOption({ label: 'outubro' });
  await page.reload();
  await openFilters(page);
  await expect(
    page.getByRole('combobox', { name: 'Mês', exact: true }).locator('option:checked'),
  ).toHaveText('outubro');
  await page.goto('/turmas/6a/registros/demo-aula-6a');
  await expect(
    page.getByRole('region', { name: 'Visão geral da aula' }).getByRole('heading', {
      name: 'Data da aula',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Visão geral da aula' }).getByRole('heading', {
      name: 'Conteúdos registrados',
    }),
  ).toBeVisible();
  const lessonOverview = page.getByRole('region', { name: 'Visão geral da aula' });
  const dateCard = lessonOverview.locator('.overview-card').filter({
    has: page.getByRole('heading', { name: 'Data da aula' }),
  });
  await expect(dateCard).not.toContainText('Ciência da Computação · 3º período A');
  await expect(lessonOverview.getByRole('heading', { name: 'Turma', exact: true })).toBeVisible();
  const contentTag = lessonOverview.locator('.lesson-content-tag').first();
  await expect(contentTag).toBeVisible();
  await expect(contentTag).toHaveCSS('border-top-left-radius', '999px');
  const lessonNavigation = page.locator('.lesson-navigation');
  const editLesson = lessonNavigation.getByRole('link', { name: 'Editar aula' });
  await expect(editLesson).toBeVisible();
  await expect(editLesson).toHaveCSS('border-top-left-radius', '999px');
  const navBounds = await lessonNavigation.boundingBox();
  const editBounds = await editLesson.boundingBox();
  expect(editBounds!.x + editBounds!.width).toBeCloseTo(navBounds!.x + navBounds!.width, 0);
  const lessonTabs = page.getByRole('navigation', { name: 'Abas da aula' });
  const classTabs = page.getByRole('navigation', { name: 'Navegação da turma' });
  await expect(classTabs.getByRole('link', { name: 'Aulas', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(lessonTabs.getByRole('link', { name: 'Aula', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(lessonTabs.getByRole('link', { name: 'Frequência' })).toBeVisible();
  await expect(lessonTabs.getByRole('link', { name: 'Avaliações' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Navegação da turma' }).getByRole('link', {
      name: 'Avaliações',
    }),
  ).toHaveCount(0);
  await lessonTabs.getByRole('link', { name: 'Avaliações' }).click();
  await expect(page).toHaveURL(/registros\/demo-aula-6a\/avaliacoes/);
  await expect(page.locator('.lesson-edit-button')).toHaveCount(0);
  await expect(classTabs.getByRole('link', { name: 'Aulas', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(lessonTabs.getByRole('link', { name: 'Avaliações' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const criterion = page.locator('tbody tr').first().getByRole('button').first();
  const originalAssessment = await criterion.textContent();
  await criterion.click();
  await expect(criterion).not.toHaveText(originalAssessment ?? '');
  const assessed = await criterion.textContent();
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Avaliação salva');
  await page.reload();
  await openFilters(page);
  await expect(criterion).toHaveText(assessed ?? '');
  await page.goto('/turmas/6a/registros/demo-aula-6a');
  await page
    .getByRole('navigation', { name: 'Abas da aula' })
    .getByRole('link', { name: 'Frequência' })
    .click();
  await expect(page.locator('.lesson-edit-button')).toHaveCount(0);
  await openFilters(page);
  await expect(page.locator('.filter-shell')).toHaveCount(0);
  await expect(page.locator('.presencas-context')).toHaveCount(0);
  await expect(page.locator('.presencas-table caption')).toContainText('novembro de 2026');
});

test('exclusão exige confirmação e professor filtra auditoria por responsável', async ({
  page,
}) => {
  await login(page);
  await page.goto('/turmas/7a/aulas');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Consultar avaliação da aula de/ })).toBeVisible();
  await page.goto('/turmas');
  await openFilters(page);
  await page
    .getByRole('button', { name: 'Excluir Administração · 4º período B', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Abrir Administração · 4º período B', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Excluir Administração · 4º período B', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /^(Descartar|Arquivar|Reativar|Excluir|Confirmar)$/ })
    .click();
  await expect(
    page.getByRole('link', { name: 'Abrir Administração · 4º período B', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await openFilters(page);
  await expect(
    page.getByRole('link', { name: 'Abrir Administração · 4º período B', exact: true }),
  ).toHaveCount(0);
});

test('navegação contextual cabe na tela em desktop e celular', async ({ page }) => {
  await login(page);
  for (const route of [
    'inicio',
    'turmas',
    'turmas/6a/visao-geral',
    'turmas/6a/alunos',
    'turmas/6a/aulas',
    'turmas/6a/frequencia',
    'turmas/6a/avaliacoes',
    'turmas/6a/gerenciar',
    'historico',
    'historico/demo-aula-6a',
    'coordenacao',
  ]) {
    await page.goto('/' + route);
    await openFilters(page);
    await page.getByRole('main').waitFor();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      route,
    ).toBe(false);
    await expect(page.locator('.turmas-nav').getByRole('link')).toHaveCount(2);
  }
});
