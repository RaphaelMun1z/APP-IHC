import { openFilters } from './filter-helpers';
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role = 'professor') {
  await page.goto('/login');
  await openFilters(page);
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
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
  await page.getByRole('link', { name: 'Minhas turmas', exact: false }).click();
  await page.getByRole('searchbox').fill('6º ano A');
  await page.getByRole('link', { name: 'Abrir 6º ano A', exact: true }).click();
  await expect(page).toHaveURL(/\/turmas\/6a\/visao-geral/);
  await page.getByRole('link', { name: 'Aulas', exact: true }).click();
  await page.getByRole('link', { name: 'Registrar aula', exact: true }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByLabel('Quem sou eu', { exact: false }).check();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Registro contextual');
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page).toHaveURL(/\/turmas\/6a\/registros\//);
  await expect(page.getByRole('main')).toContainText('Registro contextual');
  await page.goto('/historico?tipo=aula&turma=6a&conteudo=Registro%20contextual');
  await openFilters(page);
  await page.getByRole('link', { name: /^Abrir Registro de aula/ }).click();
  await page.getByRole('link', { name: 'Editar registro', exact: true }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Registro contextual revisado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('main')).toContainText('Registro contextual revisado');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await openFilters(page);
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await openFilters(page);
  await expect(page.getByLabel('Conteúdo ou observação')).toHaveValue('Registro contextual');
  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveValue('6a');
  await page.goto('/registro-aula');
  await openFilters(page);
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByLabel('Quem sou eu', { exact: false }).check();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe uma aula nesta data');
});

test('coordenação cria turma, gerencia e confirma arquivamento e reativação', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.goto('/coordenacao');
  await openFilters(page);
  await page.getByRole('link', { name: 'Nova turma' }).click();
  await page.getByLabel('Nome da turma').fill('8º ano Angular');
  await page.getByLabel('Professor responsável').selectOption('professor-02');
  await page.getByRole('combobox', { name: 'Curso', exact: true }).selectOption('formacao');
  await page.getByLabel('Módulo').selectOption('identidade');
  await page.getByLabel('Seg', { exact: true }).check();
  await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/turmas\/[^/]+\/visao-geral/);
  await expect(page.getByRole('main')).toContainText('Rafael Santos');
  await page.getByRole('link', { name: 'Alunos', exact: true }).click();
  await page.getByRole('link', { name: 'Gerenciar matrículas' }).click();
  await expect(page.getByLabel('Nome da turma')).toHaveValue('8º ano Angular');
  await page.getByLabel('Nome da turma').fill('8º ano Angular atualizado');
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page.getByRole('main')).toContainText('Matriculado');
  await page.getByRole('link', { name: 'Visão geral', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arquivar turma', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click();
  await page.reload();
  await openFilters(page);
  await expect(page.getByRole('button', { name: 'Reativar turma', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Aulas', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Registrar aula', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Visão geral', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reativar turma', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arquivar turma', exact: true })).toBeVisible();
  await page.goto('/coordenacao?busca=Angular&professor=professor-02&situacao=todas');
  await openFilters(page);
  await page.getByRole('link', { name: /^Detalhes / }).click();
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await openFilters(page);
  await expect(page.getByLabel('Buscar turma')).toHaveValue('Angular');
  await expect(page.getByRole('combobox', { name: 'Professor', exact: true })).toHaveValue(
    'professor-02',
  );
});

test('URLs diretas respeitam perfil e turma e preservam retorno após login', async ({ page }) => {
  await page.goto('/turmas/6a/alunos');
  await openFilters(page);
  await expect(page).toHaveURL(/\/login\?retorno=/);
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/turmas\/6a\/alunos$/);
  await page.goto('/turmas/7a/aulas');
  await openFilters(page);
  await expect(page).toHaveURL(/\/turmas\?indisponivel=1$/);
  await expect(page.getByRole('status').filter({ hasText: 'sem permissão' })).toContainText(
    'sem permissão',
  );
  await page.goto('/turmas/6a/gerenciar');
  await openFilters(page);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/historico/demo-aula-7a');
  await openFilters(page);
  await expect(page.getByRole('heading', { name: 'Registro indisponível' })).toBeVisible();
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
  const mark = page.locator('tbody tr').first().getByRole('button').first();
  const originalMark = await mark.textContent();
  await mark.click();
  await expect(mark).not.toHaveText(originalMark ?? '');
  const changed = await mark.textContent();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Avaliações', exact: true }).click();
  await openFilters(page);
  await expect(page).toHaveURL(/frequencia/);
  await page.getByRole('button', { name: 'Salvar frequência' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await openFilters(page);
  await expect(mark).toHaveText(changed ?? '');
  await page.getByRole('combobox', { name: 'Mês', exact: true }).selectOption({ label: 'outubro' });
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await page.reload();
  await openFilters(page);
  await expect(
    page.getByRole('combobox', { name: 'Mês', exact: true }).locator('option:checked'),
  ).toHaveText('outubro');
  await page.getByRole('link', { name: 'Avaliações', exact: true }).click();
  await openFilters(page);
  await page.getByLabel('Data da avaliação').fill('2026-11-09');
  await page.getByLabel('Data da avaliação').press('Tab');
  const criterion = page.locator('tbody tr').first().getByRole('button').first();
  const originalAssessment = await criterion.textContent();
  await criterion.click();
  await expect(criterion).not.toHaveText(originalAssessment ?? '');
  const assessed = await criterion.textContent();
  await page.getByRole('button', { name: 'Salvar avaliação', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Avaliação salva');
  await page.reload();
  await openFilters(page);
  await expect(criterion).toHaveText(assessed ?? '');
  await page.getByRole('link', { name: 'Frequência', exact: true }).click();
  await openFilters(page);
  await expect(
    page.getByRole('combobox', { name: 'Mês', exact: true }).locator('option:checked'),
  ).toHaveText('outubro');
});

test('exclusão exige confirmação e histórico da coordenação filtra professor', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.goto('/historico?professor=professor-02&turma=7a');
  await openFilters(page);
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('combobox', { name: 'Professor', exact: true })).toHaveValue(
    'professor-02',
  );
  await page.goto('/turmas');
  await openFilters(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Excluir 7º ano B', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Abrir 7º ano B', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir 7º ano B', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Abrir 7º ano B', exact: true })).toHaveCount(0);
  await page.reload();
  await openFilters(page);
  await expect(page.getByRole('link', { name: 'Abrir 7º ano B', exact: true })).toHaveCount(0);
});

test('navegação contextual cabe na tela em desktop e celular', async ({ page }) => {
  await login(page, 'coordenacao');
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
    await expect(page.locator('.turmas-nav').getByRole('link')).toHaveCount(4);
  }
});
