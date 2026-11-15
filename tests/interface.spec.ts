import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role = 'professor') {
  await page.goto('/login');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await page.getByLabel('Usuário', { exact: true }).fill(role);
  await page.getByLabel('Senha', { exact: true }).fill('ipb123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}
async function viewportDoesNotScroll(page: Page) {
  expect(
    await page.evaluate(() => ({
      documentX: document.documentElement.scrollWidth > innerWidth,
      documentY: document.documentElement.scrollHeight > innerHeight,
      bodyX: document.body.scrollWidth > innerWidth,
      bodyY: document.body.scrollHeight > innerHeight,
      y: scrollY,
      x: scrollX,
    })),
  ).toEqual({ documentX: false, documentY: false, bodyX: false, bodyY: false, y: 0, x: 0 });
}

test('páginas usam um título, breadcrumb hierárquico e retorno circular com ícone', async ({
  page,
}) => {
  await login(page);
  const checks: [string, string[]][] = [
    ['/inicio', ['Início']],
    ['/turmas', ['Início', 'Turmas']],
    ['/historico', ['Início', 'Auditoria']],
    ['/turma-form', ['Início', 'Turmas', 'Nova turma']],
    ['/turmas/6a/visao-geral?retorno=%2Fcoordenacao', ['Início', 'Turmas', '6º ano A']],
    ['/turmas/6a/aulas/nova', ['Início', 'Turmas', '6º ano A', 'Aulas', 'Registrar aula']],
    [
      '/turmas/6a/aulas/demo-aula-6a/editar',
      ['Início', 'Turmas', '6º ano A', 'Aulas', 'Editar aula'],
    ],
    ['/registro-aula.html?turma=6a', ['Início', 'Turmas', '6º ano A', 'Aulas', 'Registrar aula']],
    ['/turmas/6a/frequencia', ['Início', 'Turmas', '6º ano A', 'Frequência']],
    ['/turmas/6a/avaliacoes', ['Início', 'Turmas', '6º ano A', 'Avaliações']],
    ['/pagina-inexistente', ['Início', 'Página não encontrada']],
  ];
  for (const [route, labels] of checks) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumb.locator('li')).toHaveCount(labels.length);
    for (let i = 0; i < labels.length; i++) {
      await expect(
        crumb
          .locator('li')
          .nth(i)
          .locator(i === labels.length - 1 ? '[aria-current=page]' : 'a'),
      ).toHaveText(labels[i]);
    }
    if (labels.length > 1) {
      const back = page.getByRole('link', { name: 'Voltar', exact: true });
      await expect(back).toHaveAttribute('title', 'Voltar');
      await expect(back.locator('.material-symbols-outlined')).toHaveText('arrow_back');
      expect(
        await back.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.width === r.height && getComputedStyle(el).borderRadius === '50%';
        }),
      ).toBe(true);
    }
    await viewportDoesNotScroll(page);
    if (route.startsWith('/turmas/6a/')) {
      const section = route.split('/')[3]?.split('?')[0];
      const label = section === 'visao-geral' ? 'Visão geral' : section === 'aulas' ? 'Aulas' : '';
      const classNavigation = page.getByRole('navigation', { name: 'Navegação da turma' });
      if (label)
        await expect(
          classNavigation.getByRole('link', { name: label, exact: true }),
        ).toHaveAttribute('aria-current', 'page');
      if (section === 'frequencia')
        await expect(classNavigation.getByRole('link', { name: 'Frequência' })).toHaveCount(0);
      if (section === 'avaliacoes')
        await expect(classNavigation.getByRole('link', { name: 'Avaliações' })).toHaveCount(0);
    }
  }
});

test('filtros externos e tabelas ocupam o espaço disponível sem rolar a viewport', async ({
  page,
}) => {
  await login(page);
  for (const route of ['/historico', '/turmas', '/turmas/6a/frequencia', '/turmas/6a/avaliacoes']) {
    await page.goto(route);
    const region = page.locator('.table-scroll');
    await expect(region).toBeVisible();
    expect(
      await page.locator('.data-panel').evaluate((el) => !el.querySelector('.filter-bar')),
    ).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const before = await page.locator('app-filter-panel').boundingBox();
    await region.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.scrollLeft = el.scrollWidth;
    });
    expect(await page.locator('app-filter-panel').boundingBox()).toEqual(before);
    expect(await region.evaluate((el) => el.clientHeight)).toBeGreaterThan(90);
    await viewportDoesNotScroll(page);
  }
});

test('conteúdo extenso, filtros compactos e ações continuam alcançáveis em telas curtas', async ({
  page,
}) => {
  await login(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 700, height: 390 },
    { width: 1024, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      '/historico',
      '/turmas/6a/frequencia',
      '/turmas/6a/avaliacoes',
      '/turmas/6a/gerenciar',
    ]) {
      await page.goto(route);
      await page.locator('main').waitFor();
      if (route.endsWith('frequencia') || route.endsWith('avaliacoes')) {
        expect(
          await page.locator('.table-scroll').evaluate((el) => el.clientHeight),
        ).toBeGreaterThan(40);
      }
      await viewportDoesNotScroll(page);
      const scroll = page.locator('.data-panel,.content-scroll').first();
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
        el.scrollLeft = el.scrollWidth;
      });
      await viewportDoesNotScroll(page);
      if (route.endsWith('gerenciar')) {
        await page.getByRole('button', { name: 'Próxima etapa' }).click();
        await page.getByRole('button', { name: 'Próxima etapa' }).click();
        await page.getByRole('button', { name: 'Salvar turma' }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: 'Salvar turma' })).toBeInViewport();
      }
      if (viewport.width <= 768 && route !== '/turmas/6a/gerenciar') {
        await page.getByRole('button', { name: /^Filtros/ }).click();
        await expect(page.getByRole('button', { name: /^Filtros/ })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        await page.getByRole('button', { name: /^Filtros/ }).click();
      }
    }
  }
});

test('ações de ícone são acessíveis e todas as ações estão disponíveis ao professor', async ({
  page,
}) => {
  await login(page);
  for (const route of ['/turmas', '/historico', '/turmas/6a/aulas']) {
    await page.goto(route);
    for (const control of await page.locator('.icon-button').all()) {
      await expect(control).toHaveAttribute('title', /.+/);
      await expect(control).toHaveAttribute('aria-label', /.+/);
      await expect(control.locator('.material-symbols-outlined')).toHaveCount(1);
    }
  }
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await login(page, 'professor');
  await page.goto('/turmas');
  await expect(page.locator('.icon-button.danger')).toHaveCount(4);
  await expect(page.getByRole('link', { name: /^Editar / })).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Meu perfil' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Meu perfil' })).toHaveAccessibleDescription(
    'Mariana Oliveira Professor',
  );
  await page.getByRole('button', { name: 'Meu perfil' }).click();
  await expect(page.getByRole('dialog')).toContainText('Mariana Oliveira');
});

test('listas extensas e detalhes de avaliação usam somente a área interna de rolagem', async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => {
    const groups = Array.from({ length: 60 }, (_, index) => ({
      id: `extensa-${index}`,
      nome: `Turma adicional ${String(index).padStart(2, '0')}`,
      cursoId: 'formacao',
      moduloId: 'identidade',
      professorId: 'professor-01',
      dias: [1, 3],
      inicio: '08:00',
      fim: '08:50',
      ativa: true,
      alunoIds: ['aluno-01'],
    }));
    const original = JSON.parse(localStorage.getItem('ipb-turmas-v1') ?? '[]');
    localStorage.setItem('ipb-turmas-v1', JSON.stringify([...original, ...groups]));
  });
  await page.goto('/turmas');
  await page.getByRole('combobox', { name: 'Registros por página' }).selectOption({ label: '50' });
  await page.getByRole('button', { name: 'Última página' }).click();
  const list = page.locator('.turmas-table-scroll');
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  const last = page.getByRole('link', { name: 'Abrir Turma adicional 59', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await viewportDoesNotScroll(page);
  // Restore the catalogue fixture, leaving the seeded pedagogical records intact.
  await page.evaluate(() => localStorage.removeItem('ipb-turmas-v1'));
  await page.goto('/historico/avaliacao-6a-2026-11-09');
  await expect(page.locator('.details-table')).toBeVisible();
  expect(
    await page.locator('.details-table').evaluate((el) => getComputedStyle(el).overflowY),
  ).toBe('auto');
  const edit = page.getByRole('link', { name: 'Abrir avaliação', exact: true });
  await edit.scrollIntoViewIfNeeded();
  await expect(edit).toBeInViewport();
  await viewportDoesNotScroll(page);
});

test('login em tela pequena mantém campos e ações acessíveis sem rolar o body', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/login');
  await page.locator('#preencher-demo').scrollIntoViewIfNeeded();
  await expect(page.locator('#preencher-demo')).toBeInViewport();
  await viewportDoesNotScroll(page);
  await page.locator('#usuario').scrollIntoViewIfNeeded();
  await expect(page.locator('#usuario')).toBeInViewport();
  await viewportDoesNotScroll(page);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
});
