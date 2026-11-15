import { expect, test, type Page } from '@playwright/test';

async function openStudents(page: Page, role = 'professor') {
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turmas/6a/alunos');
}

for (const role of ['professor']) {
  test(`${role} cadastra aluno pelo atalho à direita das abas`, async ({ page }) => {
    await openStudents(page, role);
    const pageSize = page.getByRole('combobox', { name: 'Registros por página' });
    await expect(pageSize.locator('option:checked')).toHaveText('10');
    await pageSize.selectOption({ label: '25' });
    const title = page.getByRole('heading', { name: '6º ano A · Alunos', exact: true });
    const back = page.getByRole('link', { name: 'Voltar', exact: true });
    const editClass = page.getByRole('link', { name: 'Editar turma', exact: true });
    await expect(title).toBeVisible();
    await expect(page.getByRole('heading', { name: '6º ano A', exact: true })).toHaveCount(0);
    await expect(editClass).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gerenciar matrículas' })).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Navegação da turma' }).getByRole('link', {
        name: 'Gerenciar turma',
      }),
    ).toHaveCount(0);
    const titleBox = await title.boundingBox();
    const backBox = await back.boundingBox();
    const editClassBox = await editClass.boundingBox();
    const titleRow = await page.locator('.page-title-row').boundingBox();
    const classToolbar = await page.locator('.class-tabs-toolbar').boundingBox();
    const registerLink = page.getByRole('link', { name: 'Cadastrar aluno', exact: true });
    const registerBox = await registerLink.boundingBox();
    expect(titleBox!.x).toBeGreaterThan(backBox!.x + backBox!.width);
    expect(editClassBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
    expect(
      Math.abs(editClassBox!.y + editClassBox!.height / 2 - (titleBox!.y + titleBox!.height / 2)),
    ).toBeLessThan(2);
    expect(
      Math.abs(
        titleRow!.x +
          titleRow!.width -
          (editClassBox!.x + editClassBox!.width) -
          (classToolbar!.x + classToolbar!.width - (registerBox!.x + registerBox!.width)),
      ),
    ).toBeLessThan(2);
    await expect(editClass).toHaveCSS('border-radius', '999px');
    await expect(editClass).toHaveCSS('background-color', 'rgb(255, 251, 235)');
    await expect(editClass).toHaveAttribute('href', /\/turmas\/6a\/gerenciar\?retorno=/);

    const register = page.getByRole('link', { name: 'Cadastrar aluno', exact: true });
    await expect(register).toBeVisible();
    const toolbar = await page.locator('.class-tabs-toolbar').boundingBox();
    const button = await register.boundingBox();
    const tabs = await page.locator('.context-tabs-scroll').boundingBox();
    await expect(register).toHaveCSS('border-top-left-radius', '999px');
    expect(toolbar!.x + toolbar!.width - (button!.x + button!.width)).toBeLessThanOrEqual(21);
    if (page.viewportSize()!.width > 768) {
      expect(button!.x).toBeGreaterThan(tabs!.x + tabs!.width);
      expect(Math.abs(button!.y + button!.height / 2 - (tabs!.y + tabs!.height / 2))).toBeLessThan(
        2,
      );
    }
    await register.click();
    await expect(page).toHaveURL(/\/turmas\/6a\/alunos\/novo/);
    const name = page.getByLabel('Nome do aluno');
    await expect(page.getByRole('navigation', { name: 'Etapas do formulário' })).toBeVisible();
    await name.fill('Cadastro cancelado');
    page.once('dialog', (confirmation) => confirmation.accept());
    await page.getByRole('link', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/turmas\/6a\/alunos(?:\?.*)?$/);
    await expect(page.locator('.list-result-count')).toHaveText('15 alunos');
    await register.click();
    await expect(name).toHaveValue('');
    await name.fill('   ');
    await page.getByRole('button', { name: 'Salvar aluno', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Informe um nome');
    await name.fill('Beatriz Souza');
    await page.getByRole('button', { name: 'Salvar aluno', exact: true }).click();
    await expect(page.locator('.list-result-count')).toHaveText('16 alunos');
    await pageSize.selectOption({ label: '25' });
    const student = page.getByRole('row', { name: /Beatriz Souza/ });
    await student.scrollIntoViewIfNeeded();
    await expect(student).toBeVisible();
    await expect(student.getByRole('button', { name: 'Editar aluno Beatriz Souza' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.list-result-count')).toHaveText('16 alunos');
    await pageSize.selectOption({ label: '25' });
    await expect(student).toHaveCount(1);
    const navigation = page.getByRole('navigation', { name: 'Navegação da turma' });
    await navigation.getByRole('link', { name: 'Visão geral', exact: true }).click();
    await expect(register).toHaveCount(0);
    await navigation.getByRole('link', { name: 'Alunos', exact: true }).click();
    await expect(register).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });

  test(`${role} edita o aluno e exclui a matrícula com confirmação`, async ({ page }) => {
    await openStudents(page, role);
    const row = page.getByRole('row', { name: /Ana Clara Santos/ });
    await expect(
      row.getByRole('link', { name: 'Abrir frequência de Ana Clara Santos' }),
    ).toBeVisible();
    await row.getByRole('button', { name: 'Editar aluno Ana Clara Santos' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar aluno' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nome do aluno').fill('Alteração cancelada');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Editar aluno Ana Clara Santos' }).click();
    await dialog.getByLabel('Nome do aluno').fill('   ');
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Informe um nome');
    await dialog.getByLabel('Nome do aluno').fill('Ana Clara Santos Silva');
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status')).toHaveText('Aluno atualizado.');
    await page.reload();
    await page
      .getByRole('combobox', { name: 'Registros por página' })
      .selectOption({ label: '25' });
    const renamedRow = page.getByRole('row', { name: /Ana Clara Santos Silva/ });
    await expect(renamedRow).toBeVisible();

    page.once('dialog', (confirmation) => confirmation.dismiss());
    await renamedRow
      .getByRole('button', { name: 'Excluir matrícula de Ana Clara Santos Silva' })
      .click();
    await expect(page.locator('.list-result-count')).toHaveText('15 alunos');
    page.once('dialog', (confirmation) => confirmation.accept());
    await renamedRow
      .getByRole('button', { name: 'Excluir matrícula de Ana Clara Santos Silva' })
      .click();
    await expect(page.locator('.list-result-count')).toHaveText('14 alunos');
    await expect(renamedRow).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.list-result-count')).toHaveText('14 alunos');
    await page.goto('/historico/frequencia-6a-2026-11-09');
    await expect(page.getByRole('row', { name: /Ana Clara Santos Silva/ })).toBeVisible();
  });
}

test('painel branco alcança as bordas direita e inferior e mantém as ações acessíveis', async ({
  page,
}) => {
  await openStudents(page);
  await page.getByRole('button', { name: 'Próxima' }).click();
  for (const viewport of [
    { width: 1653, height: 917 },
    { width: 390, height: 900 },
    { width: 700, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const panel = await page.locator('.context-panel').boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.x + panel!.width).toBeCloseTo(viewport.width, 0);
    expect(panel!.y + panel!.height).toBeCloseTo(viewport.height, 0);
    const lastDelete = page.getByRole('button', {
      name: 'Excluir matrícula de Vitória Nascimento',
    });
    await lastDelete.scrollIntoViewIfNeeded();
    await expect(lastDelete).toBeInViewport();
    expect(
      await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth > innerWidth,
        vertical: document.body.scrollHeight > innerHeight,
        x: scrollX,
        y: scrollY,
      })),
    ).toEqual({ horizontal: false, vertical: false, x: 0, y: 0 });
  }
});

test('última matrícula fica protegida e turma arquivada permite apenas consulta', async ({
  page,
}) => {
  await openStudents(page, 'professor');
  await page.evaluate(() => {
    const groups = JSON.parse(localStorage.getItem('ipb-turmas-v1') ?? '[]');
    groups.find((group: { id: string }) => group.id === '6a').alunoIds = ['aluno-01'];
    localStorage.setItem('ipb-turmas-v1', JSON.stringify(groups));
  });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Excluir matrícula de Ana Clara Santos' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Excluir matrícula de Ana Clara Santos' }),
  ).toHaveAttribute('title', 'A turma deve ter pelo menos um aluno');
  await page.evaluate(() => {
    const groups = JSON.parse(localStorage.getItem('ipb-turmas-v1') ?? '[]');
    groups.find((group: { id: string }) => group.id === '6a').ativa = false;
    localStorage.setItem('ipb-turmas-v1', JSON.stringify(groups));
  });
  await page.reload();
  await expect(page.getByRole('link', { name: 'Cadastrar aluno', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Editar aluno / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Excluir matrícula de / })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Abrir frequência de Ana Clara Santos' }),
  ).toBeVisible();
});
