import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role: string) {
  await page.goto('/login');
  await page.locator('#usuario').fill(role);
  await page.locator('#senha').fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/turmas$/);
}

const sizes = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
  [512, 710],
  [600, 960],
  [768, 1024],
  [844, 390],
  [667, 375],
  [1024, 768],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];
const group = '/turmas/6a';
const lesson = group + '/registros/demo-aula-6a';
const shared = [
  '/login',
  '/turmas',
  '/perfil',
  '/pontos-mensais',
  '/turma-form',
  '/registro-aula',
  '/presencas',
  '/avaliacao',
  '/avaliacao/demo-aula-6a',
  '/historico/demo-aula-6a',
  '/pagina-inexistente',
  ...[
    'visao-geral',
    'alunos',
    'alunos/novo',
    'alunos/aluno-01/editar',
    'aulas',
    'aulas/nova',
    'aulas/demo-aula-6a/editar',
    'frequencia',
    'avaliacoes',
    'avaliacoes/demo-aula-6a',
    'gerenciar',
  ].map((path) => group + '/' + path),
  lesson,
  lesson + '/frequencia',
  lesson + '/avaliacoes',
];
for (const role of ['coordenacao', 'professor']) {
  test('dimensões de todas as telas de ' + role, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'A matriz define suas próprias dimensões.');
    test.setTimeout(240000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, role);
    const routes =
      role === 'coordenacao'
        ? [...shared, '/coordenacao', '/coordenacao/cadastros', '/coordenacao/vinculos']
        : shared;
    for (const path of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main').first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(path);
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        const issues = await page.evaluate(() => {
          const problems = [];
          if (
            document.documentElement.scrollWidth > innerWidth ||
            document.body.scrollWidth > innerWidth
          )
            problems.push('rolagem horizontal global');
          for (const element of document.querySelectorAll<HTMLElement>(
            'main, main > .surface, .table-scroll, .profile-card',
          )) {
            if (!element.getClientRects().length) continue;
            if (element.clientHeight < 32)
              problems.push(
                element.tagName + '.' + element.className + ' altura ' + element.clientHeight,
              );
          }
          return problems;
        });
        expect.soft(issues, role + ' ' + path + ' ' + width + '×' + height).toEqual([]);
      }
      if (path.startsWith('/coordenacao') || path === '/perfil') {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.screenshot({
          path: info.outputPath(path.slice(1).replaceAll('/', '-') + '.png'),
        });
      }
    }
  });
}

test('coordenação cadastra, consulta, vincula e preserva alterações', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.getByRole('link', { name: 'Coordenação', exact: true }).click();
  await page.getByRole('link', { name: 'Cadastros', exact: true }).click();
  const register = page.getByRole('button', { name: 'Cadastrar', exact: true });
  await expect(register).toBeDisabled();
  await page.getByLabel('Nome', { exact: true }).fill('Curso de auditoria');
  await page.getByLabel('Área', { exact: true }).fill('Tecnologia');
  await page.getByLabel('Carga horária total').fill('24');
  await register.click();
  await expect(page.getByText('Cadastro salvo.')).toBeVisible();
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click();
  await page.getByRole('searchbox').fill('Curso de auditoria');
  await page.locator('summary').filter({ hasText: 'Curso de auditoria' }).click();
  await expect(page.getByText('Nenhum módulo cadastrado.')).toBeVisible();
  await page.getByRole('searchbox').fill('não corresponde');
  await expect(page.getByText('Nenhum curso encontrado.')).toBeVisible();
  await page.getByRole('link', { name: 'Vínculos', exact: true }).click();
  await page.getByRole('combobox', { name: 'Turma', exact: true }).selectOption('6a');
  const teacher = page.getByLabel('Rafael Santos');
  await page.locator('label.form-wizard-option').filter({ hasText: 'Rafael Santos' }).click();
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(teacher).toBeChecked();
  await page.getByRole('button', { name: 'Salvar vínculos' }).click();
  await expect(page.getByText('Vínculos salvos.')).toBeVisible();
  await page.reload();
  await page.getByRole('combobox', { name: 'Turma', exact: true }).selectOption('6a');
  await expect(teacher).toBeChecked();
});

test('ponto lançado pelo professor aparece na consulta da coordenação', async ({ page }) => {
  await login(page, 'professor');
  await page.goto('/coordenacao/cadastros');
  await expect(page).toHaveURL(/\/turmas$/);
  await page.goto('/pontos-mensais');
  await page.getByLabel('Total de horas-aula').fill('12.5');
  await page.getByRole('button', { name: 'Salvar ponto' }).click();
  await expect(page.getByText('Ponto mensal salvo.')).toBeVisible();
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, 'coordenacao');
  await page.goto('/pontos-mensais');
  await page.getByRole('combobox', { name: 'Professor', exact: true }).selectOption('professor-01');
  await expect(page.locator('main li')).toContainText('12,5 h');
  await expect(page.getByRole('button', { name: 'Salvar ponto' })).toHaveCount(0);
});

test('coordenação registra currículo e equipe e recebe erro em cadastro duplicado', async ({
  page,
}) => {
  await login(page, 'coordenacao');
  await page.goto('/coordenacao/cadastros');
  const kind = page.locator('select[name=tipo]');
  const save = page.getByRole('button', { name: 'Cadastrar', exact: true });
  await kind.selectOption('modulo');
  await page.locator('[name=cursoId]').selectOption('formacao');
  await page.locator('[name=nome]').fill('Laboratório');
  await page.locator('[name=numero]').fill('33');
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Cadastro salvo.' })).toBeVisible();
  await kind.selectOption('licao');
  await page.locator('[name=moduloId]').selectOption({ label: 'Laboratório' });
  await page.locator('[name=nome]').fill('Oficina prática');
  await page.locator('[name=numero]').fill('17');
  await save.click();
  await expect(page.locator('[name=nome]')).toBeEmpty();
  for (const [type, name, cpf] of [
    ['professor', 'Docente de teste', '12345678901'],
    ['coordenador', 'Coordenação de teste', '12345678902'],
  ]) {
    await kind.selectOption(type);
    await page.locator('[name=nome]').fill(name);
    await page.getByLabel('CPF').fill(cpf);
    await page.getByLabel('E-mail').fill(type + '@example.invalid');
    if (type === 'professor') await page.getByLabel('Telefone').fill('11955550000');
    await save.click();
    await expect(page.locator('[name=nome]')).toBeEmpty();
  }
  await page.locator('[name=nome]').fill('Duplicado');
  await page.getByLabel('CPF').fill('12345678902');
  await page.getByLabel('E-mail').fill('outra@example.invalid');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('Já existe');
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await page.getByRole('searchbox').fill('Oficina prática');
  await page.locator('summary').filter({ hasText: 'Ciência da Computação' }).click();
  await expect(page.getByText('Oficina prática', { exact: true })).toHaveAttribute('value', '17');
  await page.getByRole('searchbox').fill('de teste');
  await expect(page.locator('summary')).toHaveCount(2);
});

test('filtro, paginação e ações da tabela no celular', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page, 'coordenacao');
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await page.getByRole('button', { name: 'Arquivadas', exact: true }).click();
  await expect(page.getByText('Nenhuma turma encontrada.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  const region = page.getByRole('region', { name: 'Turmas disponíveis', exact: true });
  await region.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await region
    .getByRole('button', { name: /Excluir / })
    .first()
    .click();
  await expect(page.getByRole('alertdialog')).toBeInViewport();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.goto('/turmas/6a/alunos');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('row', { name: /Vitória Nascimento/ })).toBeVisible();
});

test('coordenação cria turma, matricula, arquiva e reativa', async ({ page }) => {
  await login(page, 'coordenacao');
  await page.getByRole('link', { name: 'Nova turma', exact: true }).click();
  await page.getByLabel('Nome da turma').fill('Turma de validação');
  await page.getByLabel('Faixa etária').fill('Adultos');
  await page.getByLabel('Modalidade').fill('Presencial');
  await page.getByRole('combobox', { name: 'Professor inicial' }).selectOption('professor-02');
  await page.locator('.form-wizard-option').filter({ hasText: 'Ciência da Computação' }).click();
  await page.locator('.form-wizard-option').filter({ hasText: 'Engenharia de Software' }).click();
  const next = page.getByRole('button', { name: 'Próxima etapa' });
  await next.click();
  await page.locator('.form-wizard-option').filter({ hasText: 'Seg' }).click();
  await next.click();
  await page.locator('.form-wizard-option').filter({ hasText: 'Ana Clara Santos' }).click();
  await page.getByRole('button', { name: 'Salvar turma' }).click();
  await expect(page).toHaveURL(/visao-geral/);
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Alunos' })
    .click();
  await page.getByRole('link', { name: 'Cadastrar aluno' }).click();
  await page.getByLabel('Nome do aluno').fill('Estudante da validação');
  await page.getByRole('button', { name: 'Salvar aluno' }).click();
  await expect(page.locator('.list-result-count')).toHaveText('2 alunos');
  await page
    .getByRole('navigation', { name: 'Navegação da turma' })
    .getByRole('link', { name: 'Visão geral' })
    .click();
  for (const verb of ['Arquivar', 'Reativar']) {
    await page.getByRole('button', { name: verb + ' turma', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: verb, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Arquivar turma' })).toBeVisible();
});
