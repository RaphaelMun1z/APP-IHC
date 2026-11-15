import { test, expect, type Page } from '@playwright/test';
import { openFilters } from './filter-helpers';
async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#usuario').fill('professor');
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
  await expect(page.locator('.historico-table thead th')).toHaveText([
    'Data',
    'Tipo',
    'Turma',
    'Resumo',
  ]);
  await expect(page.locator('.historico-table .icon-button')).toHaveCount(0);
  await expect(page.locator('.filter-search-form .material-symbols-outlined')).toHaveText('search');
  await expect(page.locator('.filter-shell')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.filter-shell')).toHaveCSS('border-top-width', '0px');
  expect(
    await page
      .getByRole('combobox', { name: 'Registros por página' })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(30);
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
  await expect(page.locator('.historico-table tbody a')).toHaveCount(0);
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
    ['/coordenacao', '4 turmas'],
    ['/turmas', '4 turmas'],
    ['/historico', '12 registros'],
    ['/turmas/6a/frequencia', '15 alunos'],
    ['/turmas/6a/avaliacoes', '1 aula'],
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

test('aulas da turma usam tabela e ação no toolbar de navegação', async ({ page }) => {
  await login(page);
  await page.goto('/turmas/6a/aulas');

  const register = page.getByRole('link', { name: 'Registrar aula', exact: true });
  await expect(register).toBeVisible();
  await expect(register.locator('.material-symbols-outlined')).toHaveText('add');
  await expect(register).toHaveCSS('border-top-left-radius', '999px');
  const toolbar = await page.locator('.class-tabs-toolbar').boundingBox();
  const button = await register.boundingBox();
  const tabs = await page.locator('.context-tabs-scroll').boundingBox();
  expect(toolbar!.x + toolbar!.width - (button!.x + button!.width)).toBeLessThanOrEqual(21);
  if (page.viewportSize()!.width > 768) {
    expect(button!.x).toBeGreaterThan(tabs!.x + tabs!.width);
  }

  const table = page.getByRole('region', { name: 'Aulas registradas na turma' });
  await expect(table.getByRole('columnheader')).toHaveText(['Data', 'Tipo', 'Conteúdo', 'Ações']);
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table.getByRole('link', { name: /Abrir registro de/ })).toBeVisible();
  const call = table.getByRole('link', { name: /Realizar chamada de/ });
  await expect(call).toHaveAttribute('href', /frequencia\?data=2026-11-09/);
  await expect(table.getByRole('link', { name: /Avaliar alunos da aula de/ })).toBeVisible();
});

test('listagem de aulas filtra por tipo, período e conteúdo', async ({ page }) => {
  await login(page);
  await page.goto('/turmas/6a/aulas');

  const count = page.locator('.list-result-count');
  await expect(count).toHaveText('1 aula');
  await openFilters(page);
  await page.getByRole('combobox', { name: 'Tipo de aula' }).selectOption('PR1');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(count).toHaveText('0 aulas');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(count).toHaveText('1 aula');

  await page.getByLabel('Data inicial').fill('2026-11-10');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(count).toHaveText('0 aulas');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(count).toHaveText('1 aula');

  await page.getByRole('searchbox', { name: 'Conteúdo da aula' }).fill('conteúdo inexistente');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(count).toHaveText('0 aulas');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(count).toHaveText('1 aula');
});

test('frequência dentro da turma exibe um único controle de filtros e oculta o seletor de turma', async ({
  page,
}) => {
  await login(page);
  await page.goto('/turmas/6a/frequencia');

  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveCount(0);
  await expect(page.locator('.filter-toolbar .filter-context')).toHaveCount(0);
  await expect(page.locator('.filter-toolbar .filter-toggle')).toHaveCount(1);
});

test('frequência vinculada à aula usa a data da aula sem filtros de período', async ({ page }) => {
  await login(page);
  await page.goto('/turmas/6a/registros/demo-aula-6a/frequencia');

  await expect(page.locator('.filter-shell')).toHaveCount(0);
  await expect(page.locator('.presencas-context')).toHaveCount(0);
  await expect(page.locator('.presencas-table caption')).toContainText('novembro de 2026');
});

test('avaliações dentro da turma seguem o contexto visual da frequência', async ({ page }) => {
  await login(page);
  await page.goto('/turmas/6a/avaliacoes');

  await expect(page.getByRole('combobox', { name: 'Turma', exact: true })).toHaveCount(0);
  await expect(page.locator('.filter-toolbar .filter-context')).toHaveCount(0);
  await expect(page.locator('.filter-toolbar .filter-toggle')).toHaveCount(1);

  await page
    .getByRole('link', { name: /Avaliar alunos da aula de/ })
    .first()
    .click();
  await expect(page).toHaveURL(/registros\/demo-aula-6a\/avaliacoes/);
  await expect(page.getByRole('link', { name: 'Voltar às aulas' })).toHaveCount(0);
  await expect(page.locator('.assessment-lesson-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0);
  await page.locator('tbody tr').first().getByRole('button').first().click();
  const footer = await page.locator('.avaliacao-footer').boundingBox();
  const saveButton = await page.getByRole('button', { name: 'Salvar alterações' }).boundingBox();
  expect(footer!.x + footer!.width - (saveButton!.x + saveButton!.width)).toBeLessThanOrEqual(1);
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

test('turmas usam tabela com filtros e ações de edição e exclusão', async ({ page }) => {
  await login(page);
  await page.goto('/turmas');
  await expect(page.getByRole('columnheader')).toHaveText([
    'Selecionar',
    'Turma',
    'Curso',
    'Professor',
    'Horário',
    'Alunos',
    'Situação',
    'Ações',
  ]);
  const edit = page.getByRole('link', { name: 'Editar 6º ano A' });
  const remove = page.getByRole('button', { name: 'Excluir 6º ano A' });
  const open = page.getByRole('link', { name: 'Abrir 6º ano A' });
  await expect(edit).toBeInViewport();
  await expect(remove).toBeInViewport();
  await expect(open).toHaveAttribute('data-action', 'open_in_new');
  await expect(edit).toHaveAttribute('data-action', 'edit');
  await expect(remove).toHaveAttribute('data-action', 'delete');
  const colors = await page
    .locator('.turma-row')
    .filter({ hasText: '6º ano A' })
    .locator('.icon-button')
    .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).color));
  expect(new Set(colors).size).toBe(4);
  await expect(
    page.locator('.turma-row').filter({ hasText: '6º ano A' }).locator('.actions-cell'),
  ).toHaveCSS('box-shadow', 'none');

  await openFilters(page);
  await page.getByRole('combobox', { name: 'Curso' }).selectOption('formacao');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.locator('.turma-row')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Remover filtro Curso: Formação integral' }),
  ).toBeVisible();
});

test('turmas fixadas ficam disponíveis na tela inicial e podem ser desafixadas', async ({
  page,
}) => {
  await login(page);
  await page.goto('/turmas');
  const pin = page.getByRole('button', { name: 'Fixar 6º ano A' });
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('Turma fixada na tela inicial.');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Desafixar 6º ano A' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/inicio');
  const pinnedClass = page.getByRole('link', { name: /6º ano A/ });
  await expect(pinnedClass).toBeVisible();
  await expect(pinnedClass).toContainText('Formação integral');
  await pinnedClass.click();
  await expect(page).toHaveURL(/\/turmas\/6a\/visao-geral$/);

  await page.goto('/turmas');
  await page.getByRole('button', { name: 'Desafixar 6º ano A' }).click();
  await expect(page.getByRole('button', { name: 'Fixar 6º ano A', exact: true })).toBeVisible();
  await page.goto('/inicio');
  await expect(page.getByText('Fixe as turmas mais utilizadas')).toBeVisible();
});

test('cada tipo de aula usa uma cor de tag diferente', async ({ page }) => {
  await login(page);
  const colors: string[] = [];
  for (const id of ['6a', '6b', '7a', '7b']) {
    await page.goto(`/turmas/${id}/aulas`);
    const tag = page.locator('.lesson-type-badge');
    await expect(tag).toHaveCount(1);
    colors.push(await tag.evaluate((element) => getComputedStyle(element).color));
  }
  expect(new Set(colors).size).toBe(4);
});

test('tabelas usam a paginação compartilhada com 10 registros por padrão', async ({ page }) => {
  await login(page);
  await page.goto('/turmas');
  const classSize = page.getByRole('combobox', { name: 'Registros por página' });
  await expect(classSize.locator('option:checked')).toHaveText('10');
  await expect(classSize.locator('option')).toHaveText(['10', '15', '25', '50']);

  await page.goto('/turmas/6a/alunos');
  const studentSize = page.getByRole('combobox', { name: 'Registros por página' });
  await expect(studentSize.locator('option:checked')).toHaveText('10');
  await expect(page.locator('.students-table tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.locator('.students-table tbody tr')).toHaveCount(5);
  await studentSize.selectOption({ label: '15' });
  await expect(page.locator('.students-table tbody tr')).toHaveCount(15);

  await page.goto('/turmas/6a/aulas');
  await expect(
    page.getByRole('combobox', { name: 'Registros por página' }).locator('option:checked'),
  ).toHaveText('10');
  await page.goto('/turmas/6a/avaliacoes');
  await expect(page.locator('app-pagination').first()).toBeVisible();
  await expect(
    page
      .locator('app-pagination')
      .first()
      .getByRole('combobox', { name: 'Registros por página' })
      .locator('option:checked'),
  ).toHaveText('10');
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
  const pastDate = '2026-11-09';
  await page.getByRole('button', { name: `Editar chamada de ${pastDate}` }).click();
  const first = page.getByRole('button', { name: new RegExp(`Ana Clara Santos, ${pastDate}:`) });
  const before = await first.textContent();
  await first.click();
  await expect(first).not.toHaveText(before ?? '');
  const changed = await first.textContent();
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Primeira página' }).click();
  await expect(first).toHaveText(changed ?? '');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText('Frequência salva');
  await page.reload();
  await expect(first).toHaveText(changed ?? '');
});
