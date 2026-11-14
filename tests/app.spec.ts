import { openFilters } from './filter-helpers';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page, role = 'professor') {
  await page.goto('/login');
  await openFilters(page);
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && /ERROR|NG\d{4}/.test(message.text()))
      throw new Error(message.text());
  });
});

test('login, ajuda, usuário lembrado e encerramento da sessão', async ({ page }) => {
  await page.goto('/login');
  await openFilters(page);
  await page.getByRole('button', { name: 'Esqueceu a senha?' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Esqueceu a senha?' })).toBeFocused();
  await page.getByLabel('Usuário', { exact: true }).fill('professor');
  await page.getByLabel('Senha', { exact: true }).fill('errada');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveValue('professor');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('ipb-sessao-v1'))).toBeNull();
});

test('rotas antigas mantêm parâmetros e os perfis restringem acesso', async ({ page }) => {
  await page.goto('/registro-aula.html?turma=6b');
  await openFilters(page);
  await expect(page).toHaveURL(/\/login\?retorno=/);
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/registro-aula\?turma=6b$/);
  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveValue('6b');
  await page.goto('/coordenacao');
  await openFilters(page);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turma-form');
  await openFilters(page);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turmas');
  await openFilters(page);
  await expect(page.locator('.turma-row')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Nova turma' })).toHaveCount(0);
  await page.goto('/pagina-inexistente');
  await openFilters(page);
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('protege alterações ao navegar e ao trocar filtros', async ({ page }) => {
  await login(page);
  await page.goto('/registro-aula');
  await openFilters(page);
  await page.getByLabel('Data da aula').fill('2026-11-07');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Histórico', exact: true }).click();
  await expect(page).toHaveURL(/\/registro-aula$/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Histórico', exact: true }).click();
  await expect(page).toHaveURL(/\/historico$/);
});

test('frequência salva e recarrega a marcação, avaliação mantém os três estados', async ({
  page,
}) => {
  await login(page);
  await page.goto('/presencas?turma=6a&data=2026-11-09');
  await openFilters(page);
  const firstMark = page.locator('tbody tr').first().getByRole('button').first();
  const original = await firstMark.textContent();
  await firstMark.click();
  await expect(firstMark).not.toHaveText(original ?? '');
  const changed = await firstMark.textContent();
  expect(changed).not.toBe(original);
  await page.getByRole('button', { name: 'Salvar frequência' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await openFilters(page);
  await expect(firstMark).toHaveText(changed ?? '');
  await page.goto('/avaliacao?turma=6a&data=2026-11-09');
  await openFilters(page);
  const criterion = page.locator('tbody tr').first().getByRole('button').first();
  const initial = await criterion.textContent();
  await criterion.press('Space');
  await expect(criterion).not.toHaveText(initial ?? '');
  const updated = await criterion.textContent();
  expect(updated).not.toBe(initial);
  await page.getByRole('button', { name: 'Salvar avaliação', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('Avaliação salva');
  await page.reload();
  await openFilters(page);
  await expect(criterion).toHaveText(updated ?? '');
  await criterion.click();
  await criterion.click();
  await expect(criterion).toHaveText(initial ?? '');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('combobox', { name: 'Turma', exact: true }).selectOption('6b');
  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveValue('6a');
});

test('histórico filtra, pagina e valida o intervalo de datas', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.goto('/historico');
  await openFilters(page);
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Data inicial').fill('2026-11-14');
  await page.getByLabel('Data final').fill('2026-11-01');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('data final');
  await page.getByRole('button', { name: 'Limpar' }).click();
  await page.getByLabel('Tipo de registro').selectOption('avaliacao');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
});

test('sair da conta respeita alterações não salvas e uma falha mantém a sessão', async ({
  page,
}) => {
  await login(page);
  await page.goto('/registro-aula');
  await openFilters(page);
  await page.getByLabel('Data da aula').fill('2026-11-07');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await expect(page).toHaveURL(/\/registro-aula$/);
  expect(await page.evaluate(() => sessionStorage.getItem('ipb-sessao-v1'))).not.toBeNull();
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new Error('Armazenamento bloqueado');
    };
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await expect(page).toHaveURL(/\/registro-aula$/);
  await expect(page.getByRole('alert')).toContainText('Não foi possível encerrar a sessão');
});

test('falha de gravação mostra erro e preserva os registros anteriores', async ({ page }) => {
  await login(page);
  await page.goto('/registro-aula');
  await openFilters(page);
  const previous = await page.evaluate(() => localStorage.getItem('ipb-aulas-v1'));
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByLabel('Quem sou eu', { exact: false }).check();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Armazenamento cheio');
    };
  });
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível salvar' }).first(),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ipb-aulas-v1'))).toBe(previous);
  await expect(page).toHaveURL(/\/registro-aula$/);
});

test('dados locais corrompidos são preservados e apresentam erro visível', async ({ page }) => {
  await page.goto('/login');
  await openFilters(page);
  await page.evaluate(() => localStorage.setItem('ipb-turmas-v1', '{corrompido'));
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.goto('/turmas');
  await openFilters(page);
  await expect(page.getByRole('alert')).toContainText('dados originais foram preservados');
  expect(await page.evaluate(() => localStorage.getItem('ipb-turmas-v1'))).toBe('{corrompido');
});
