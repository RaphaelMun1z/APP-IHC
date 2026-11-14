import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import baselines from './visual-baseline.json';

async function login(page: Page, role = 'professor') {
  await page.goto('/login');
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
  await page.getByRole('button', { name: 'Opções de Mariana Oliveira' }).click();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveValue('professor');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('ipb-sessao-v1'))).toBeNull();
});

test('rotas antigas mantêm parâmetros e os perfis restringem acesso', async ({ page }) => {
  await page.goto('/registro-aula.html?turma=6b');
  await expect(page).toHaveURL(/\/login\?retorno=/);
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/registro-aula\?turma=6b$/);
  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveValue('6b');
  await page.goto('/coordenacao');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turma-form');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turmas');
  await expect(page.locator('.turma-row')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Nova turma' })).toHaveCount(0);
  await page.goto('/pagina-inexistente');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('cria aula, consulta conteúdo no histórico, edita e rejeita duplicata', async ({ page }) => {
  await login(page);
  await page.goto('/registro-aula');
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByLabel('Quem sou eu', { exact: false }).check();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Teste de migração Angular');
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.getByRole('status')).toContainText('Aula salva');
  await expect(page).toHaveURL(/\/registro-aula\?id=/);
  const editUrl = page.url();
  await page.goto('/historico?tipo=aula');
  await page.getByLabel('Conteúdo ou observação').fill('Teste de migração Angular');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: /^Abrir Registro de aula/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Teste de migração Angular');
  await page.getByRole('link', { name: 'Editar registro' }).click();
  await expect(page).toHaveURL(editUrl);
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('textbox', { name: 'Observações' }).fill('Observação revisada');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText('Aula salva');
  await page.goto('/registro-aula');
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByLabel('Quem sou eu', { exact: false }).check();
  await page.getByRole('button', { name: 'Próxima etapa' }).click();
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe uma aula nesta data');
});

test('protege alterações ao navegar e ao trocar filtros', async ({ page }) => {
  await login(page);
  await page.goto('/registro-aula');
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
  const firstMark = page.locator('tbody tr').first().getByRole('button').first();
  const original = await firstMark.textContent();
  await firstMark.click();
  await expect(firstMark).not.toHaveText(original ?? '');
  const changed = await firstMark.textContent();
  expect(changed).not.toBe(original);
  await page.getByRole('button', { name: 'Salvar frequência' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await expect(firstMark).toHaveText(changed ?? '');
  await page.goto('/avaliacao?turma=6a&data=2026-11-09');
  const criterion = page.locator('tbody tr').first().getByRole('button').first();
  const initial = await criterion.textContent();
  await criterion.press('Space');
  await expect(criterion).not.toHaveText(initial ?? '');
  const updated = await criterion.textContent();
  expect(updated).not.toBe(initial);
  await page.getByRole('button', { name: 'Salvar avaliação', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('Avaliação salva');
  await page.reload();
  await expect(criterion).toHaveText(updated ?? '');
  await criterion.click();
  await criterion.click();
  await expect(criterion).toHaveText(initial ?? '');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('combobox', { name: 'Turma', exact: true }).selectOption('6b');
  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveValue('6a');
});

test('coordenação cria, arquiva, reativa e exclui turmas com persistência', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.goto('/turma-form');
  await page.getByLabel('Nome da turma').fill('8º ano Angular');
  await page.getByLabel('Professor responsável').selectOption('professor-02');
  await page.getByRole('combobox', { name: 'Curso', exact: true }).selectOption('formacao');
  await page.getByLabel('Módulo').selectOption('identidade');
  await page.getByLabel('Seg', { exact: true }).check();
  await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/coordenacao$/);
  const row = page.getByRole('row').filter({ hasText: '8º ano Angular' });
  await expect(row).toContainText('Rafael Santos');
  await row.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Turma ativa').uncheck();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/coordenacao$/);
  await page.getByLabel('Situação').selectOption('arquivadas');
  await expect(row).toContainText('Arquivada');
  await row.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Turma ativa').check();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/\/coordenacao$/);
  await page.goto('/turmas');
  await page.getByRole('searchbox', { name: 'Buscar turma pelo nome' }).fill('Angular');
  await page.getByLabel('Selecionar todas as turmas').check();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Apagar 1 turmas selecionadas' }).click();
  await expect(page.locator('.turma-row')).toHaveCount(0);
  await page.reload();
  await page.getByRole('searchbox', { name: 'Buscar turma pelo nome' }).fill('Angular');
  await expect(page.locator('.turma-row')).toHaveCount(0);
});

test('histórico filtra, pagina e valida o intervalo de datas', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.goto('/historico');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Data inicial').fill('2026-11-14');
  await page.getByLabel('Data final').fill('2026-11-01');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('data final');
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByLabel('Tipo de registro').selectOption('avaliacao');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
});

test('sair da conta respeita alterações não salvas e uma falha mantém a sessão', async ({
  page,
}) => {
  await login(page);
  await page.goto('/registro-aula');
  await page.getByLabel('Data da aula').fill('2026-11-07');
  await page.getByRole('button', { name: 'Opções de Mariana Oliveira' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/registro-aula$/);
  expect(await page.evaluate(() => sessionStorage.getItem('ipb-sessao-v1'))).not.toBeNull();
  await page.getByRole('button', { name: 'Opções de Mariana Oliveira' }).click();
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new Error('Armazenamento bloqueado');
    };
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/registro-aula$/);
  await expect(page.getByRole('alert')).toContainText('Não foi possível encerrar a sessão');
});

test('falha de gravação mostra erro e preserva os registros anteriores', async ({ page }) => {
  await login(page);
  await page.goto('/registro-aula');
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
  await page.evaluate(() => localStorage.setItem('ipb-turmas-v1', '{corrompido'));
  await page.getByRole('button', { name: 'Preencher credenciais de teste' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.goto('/turmas');
  await expect(page.getByRole('alert')).toContainText('dados originais foram preservados');
  expect(await page.evaluate(() => localStorage.getItem('ipb-turmas-v1'))).toBe('{corrompido');
});

test('mantém dimensões e cores das telas originais em desktop e celular', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 1440;
  for (const route of [
    'login',
    'inicio',
    'turmas',
    'registro-aula',
    'presencas',
    'avaliacao',
    'historico',
  ]) {
    if (route === 'inicio') await login(page, 'coordenacao');
    await page.goto(`/${route}`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const key = `${route}-${width}` as keyof typeof baselines;
    for (const [selector, baseline] of Object.entries(baselines[key])) {
      const actual = await page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            background: s.backgroundColor,
            color: s.color,
          };
        });
      for (const dimension of ['x', 'y', 'width', 'height'] as const)
        expect(
          Math.abs(actual[dimension] - baseline[dimension]),
          `${key}: ${selector} ${dimension}`,
        ).toBeLessThanOrEqual(3);
      expect(actual.background, `${key}: ${selector} fundo`).toBe(baseline.background);
      expect(actual.color, `${key}: ${selector} texto`).toBe(baseline.color);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      `${route}: rolagem horizontal`,
    ).toBe(false);
    await page.screenshot({
      path: `.preview/angular-migration/verified/${route}-${width}.png`,
      fullPage: true,
    });
  }
});
