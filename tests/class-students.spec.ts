import { expect, test, type Page } from '@playwright/test';

async function openStudents(page: Page, role = 'professor') {
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/turmas/6a/alunos');
}

for (const role of ['professor', 'coordenacao']) {
  test(`${role} cadastra e matricula aluno pelo botão à direita das abas`, async ({ page }) => {
    await openStudents(page, role);
    const register = page.getByRole('button', { name: 'Cadastrar aluno', exact: true });
    await expect(register).toBeVisible();
    const toolbar = await page.locator('.class-tabs-toolbar').boundingBox();
    const button = await register.boundingBox();
    const tabs = await page.locator('.context-tabs-scroll').boundingBox();
    expect(toolbar!.x + toolbar!.width - (button!.x + button!.width)).toBeLessThanOrEqual(21);
    if (page.viewportSize()!.width > 768) {
      expect(button!.x).toBeGreaterThan(tabs!.x + tabs!.width);
      expect(Math.abs(button!.y + button!.height / 2 - (tabs!.y + tabs!.height / 2))).toBeLessThan(
        2,
      );
    }
    await register.click();
    const dialog = page.getByRole('dialog', { name: 'Cadastrar aluno' });
    await dialog.getByLabel('Nome do aluno').fill('Cadastro cancelado');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.locator('.list-result-count')).toHaveText('15 alunos');
    await register.click();
    await expect(dialog.getByLabel('Nome do aluno')).toHaveValue('');
    await dialog.getByLabel('Nome do aluno').fill('   ');
    await dialog.getByRole('button', { name: 'Salvar aluno', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Informe um nome');
    await dialog.getByLabel('Nome do aluno').fill('Beatriz Souza');
    await dialog.getByRole('button', { name: 'Salvar aluno', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.list-result-count')).toHaveText('16 alunos');
    const student = page.getByRole('row', { name: /Beatriz Souza/ });
    await student.scrollIntoViewIfNeeded();
    await expect(student).toBeVisible();
    await expect(student.getByRole('button', { name: 'Editar aluno Beatriz Souza' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.list-result-count')).toHaveText('16 alunos');
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
        vertical: document.documentElement.scrollHeight > innerHeight,
        x: scrollX,
        y: scrollY,
      })),
    ).toEqual({ horizontal: false, vertical: false, x: 0, y: 0 });
  }
});

test('última matrícula fica protegida e turma arquivada permite apenas consulta', async ({
  page,
}) => {
  await openStudents(page, 'coordenacao');
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
  await expect(page.getByRole('button', { name: 'Cadastrar aluno', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Editar aluno / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Excluir matrícula de / })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Abrir frequência de Ana Clara Santos' }),
  ).toBeVisible();
});
