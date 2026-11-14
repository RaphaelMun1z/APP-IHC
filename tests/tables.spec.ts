import { test, expect, type Page } from '@playwright/test';
import { openFilters } from './filter-helpers';
async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#usuario').fill('coordenacao');
  await page.locator('#senha').fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/inicio$/);
}
test('densidade compacta e controles sem redundância', async ({ page }) => {
  await login(page);
  await page.goto('/historico');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.filter-content')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Adicionar filtro' })).toHaveCount(0);
  await expect(page.getByText('Mais recentes primeiro', { exact: true })).toHaveCount(0);
  expect(
    await page.locator('.filter-search-box').evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(450);
  const row = await page.locator('tbody tr').first().boundingBox();
  expect(row?.height).toBeGreaterThanOrEqual(44);
  expect(row?.height).toBeLessThanOrEqual(64);
  expect(
    await page
      .locator('tbody td')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe('14px');
  await expect(page.locator('.filter-shell')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.filter-shell')).toHaveCSS('border-top-width', '0px');
  expect(
    await page
      .getByRole('combobox', { name: 'Registros por página' })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(30);
  expect(
    await page
      .locator('.icon-button')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopStyle),
  ).toBe('solid');
  await openFilters(page);
  for (const name of ['Aplicar', 'Limpar']) {
    expect(
      await page
        .getByRole('button', { name, exact: true })
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThan(90);
  }
});
test('combina filtros, remove chips individualmente e limpa a consulta', async ({ page }) => {
  await login(page);
  await page.goto('/historico');
  await openFilters(page);
  await page.getByRole('combobox', { name: 'Tipo de registro', exact: true }).selectOption('aula');
  await page.getByRole('combobox', { name: 'Turma', exact: true }).selectOption('6a');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remover filtro Turma: 6º ano A' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Remover filtro Tipo: Aula' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.locator('.filter-chip')).toHaveCount(0);
});
test('contagem no cabeçalho e ações consistentes em todas as listagens', async ({ page }) => {
  await login(page);
  for (const [route, count] of [
    ['/turmas', '4 turmas'],
    ['/coordenacao', '4 turmas'],
    ['/historico', '12 registros'],
    ['/turmas/6a/frequencia', '15 alunos'],
    ['/turmas/6a/avaliacoes', '15 alunos'],
    ['/turmas/6a/alunos', '15 alunos'],
    ['/turmas/6a/aulas', '1 aula'],
    ['/historico/frequencia-6a-2026-11-09', '15 alunos'],
    ['/historico/avaliacao-6a-2026-11-09', '113 registros'],
  ]) {
    await page.goto(route);
    const header = page.locator('app-list-header');
    await expect(header).toHaveCount(1);
    await expect(header.locator('.list-result-count')).toHaveText(count);
    await page.evaluate(() => document.fonts.ready);
    const alignment = await header.evaluate((element) => {
      const heading = element.querySelector('h2')!.getBoundingClientRect();
      const result = element.querySelector('.list-result-count')!.getBoundingClientRect();
      return {
        right: result.x > heading.x,
        offset: Math.abs(result.y + result.height / 2 - (heading.y + heading.height / 2)),
      };
    });
    expect(alignment.right).toBe(true);
    expect(alignment.offset).toBeLessThan(2);
    expect((await page.locator('app-pagination').allTextContents()).join('')).not.toMatch(
      /\d+–\d+ de \d+/,
    );
  }
});

test('busca de turmas usa a barra compartilhada e remove o filtro pelo teclado', async ({
  page,
}) => {
  await login(page);
  await page.goto('/turmas');
  const search = page.getByRole('searchbox', { name: 'Buscar turma pelo nome' });
  await expect(page.locator('.filter-chip-row')).toHaveCount(0);
  await search.fill('6º');
  await expect(page.locator('.turma-row')).toHaveCount(2);
  await expect(page.locator('.list-result-count')).toHaveText('2 turmas');
  await expect(page).toHaveURL(/busca=/);
  const remove = page.getByRole('button', { name: 'Remover filtro Busca: 6º' });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(search).toHaveValue('');
  await expect(page.locator('.filter-chip-row')).toHaveCount(0);
  await expect(page.locator('.list-result-count')).toHaveText('4 turmas');
});

test('remover chip preserva os outros filtros aplicados sem aplicar edições pendentes', async ({
  page,
}) => {
  await login(page);
  await page.goto('/historico?turma=6a&tipo=aula');
  await openFilters(page);
  await page
    .getByRole('combobox', { name: 'Tipo de registro', exact: true })
    .selectOption('avaliacao');
  await page.getByRole('button', { name: 'Remover filtro Turma: 6º ano A' }).click();
  await expect(page.getByRole('combobox', { name: 'Tipo de registro', exact: true })).toHaveValue(
    'aula',
  );
  await expect(page.locator('.list-result-count')).toHaveText('4 registros');
  await expect(page.getByRole('button', { name: 'Remover filtro Tipo: Aula' })).toBeVisible();
});
test('paginação mantém tamanho e filtros na URL e fixa o rodapé', async ({ page }) => {
  await login(page);
  await page.goto('/historico?turma=6a');
  await page.getByRole('combobox', { name: 'Registros por página' }).selectOption({ label: '25' });
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Registros por página' }).locator('option:checked'),
  ).toHaveText('25');
  await expect(page.getByRole('button', { name: 'Remover filtro Turma: 6º ano A' })).toBeVisible();
  await page.goto('/historico');
  const footer = await page.locator('app-pagination').boundingBox();
  await page.getByRole('button', { name: 'Última página' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Primeira página' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.locator('.table-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await page.locator('app-pagination').boundingBox()).toEqual(footer);
});
test('rascunhos de frequência sobrevivem à troca de página', async ({ page }) => {
  await login(page);
  await page.goto('/turmas/6a/frequencia?data=2026-11-09');
  await page.getByRole('combobox', { name: 'Registros por página' }).selectOption({ label: '10' });
  const first = page.locator('tbody tr').first().getByRole('button').first();
  const before = await first.textContent();
  await first.click();
  await expect(first).not.toHaveText(before ?? '');
  const changed = await first.textContent();
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Primeira página' }).click();
  await expect(first).toHaveText(changed ?? '');
  await page.getByRole('button', { name: 'Salvar frequência' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await expect(first).toHaveText(changed ?? '');
});
