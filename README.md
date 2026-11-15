# IPB · APP 1

Aplicação pedagógica em Angular para gestão de turmas, registro de aulas, frequência, avaliação observacional e auditoria. A identidade visual original, os assets e os dados locais foram mantidos.

## Executar

Requer Node.js `^22.22.3`, `^24.15.0` ou `^26.0.0` e npm. O projeto usa Angular **22.2.6**, Angular CLI/build **22.2.7** e TypeScript **6.0**; as versões exatas das dependências estão no `package-lock.json`.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:4173`. `npm start` também inicia o desenvolvimento. Para outra porta: `npx ng serve --host 127.0.0.1 --port 4200`.

O acesso continua demonstrativo: existe apenas o perfil `professor`, com acesso a todas as funcionalidades. Credenciais de teste: usuário `professor` e senha pública `ipb123`. A opção de lembrar usuário não grava a senha. Google, cadastro e recuperação mantêm as mensagens explicativas existentes; não há integração externa para esses recursos.

## Integração REST e troca da fonte

A aplicação funciona sem backend por padrão. Em `src/environments/environment.ts`, `api.mode` seleciona `mock` ou `api`, e `api.baseUrl` define a URL do futuro backend. Com a URL configurada, basta alterar `mode`; componentes e contratos permanecem iguais. O mesmo ambiente é usado no desenvolvimento e no build de produção. A latência e as falhas simuladas também ficam nessa configuração.

Consulte [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) para os 21 contratos HTTP, exemplos completos, regras existentes e decisões pendentes. A especificação formal está em [docs/openapi.yaml](docs/openapi.yaml). Cookie de sessão, CORS/CSRF, expiração e concorrência precisam ser validados com o backend; não há envio automático dos dados locais.

```sh
npm run test:contracts
npm test
```

O primeiro comando valida todos os exemplos e referências de schema; a suíte Angular também verifica requests e responses das 21 operações mockadas contra o OpenAPI. Há teste de modo api que confirma o encaminhamento ao transporte e a ausência de inicialização local.

Para exercer o FetchBackend real contra uma simulação HTTP local, use o Postman CLI 1.75 ou posterior. Em um terminal:

```sh
npm run mock:transport
```

Em outro terminal:

```sh
npm run test:transport
```

O mock de transporte é regenerado da especificação em `.preview/http-mock`, sem upload e sem login, e usa a porta 4011. Encerre o servidor com Ctrl+C após os testes. A simulação cobre login, os sete snapshots, HTTP 503 e timeout. Ela reproduz exemplos e não comprova autenticação real, cookies/CORS de navegador ou CRUD persistente; o CRUD e as regras são testados contra o interceptor mock da aplicação. O contexto e os limites da evidência ficam em `postman/simulations/ipb-http.context.yaml`.

## Publicar no GitHub Pages

O repositório publica automaticamente no GitHub Pages a cada push para `main` pelo workflow `.github/workflows/deploy-github-pages.yml`. Ative **Settings → Pages → Build and deployment → GitHub Actions** na configuração do repositório. O build usa a base `/APP-IHC/`, conforme o nome deste repositório. Para outro nome, ajuste a opção `--base-href` em `build:github-pages` no `package.json`.

O build cria `404.html` junto ao `index.html` e restaura a rota original antes de iniciar o Angular. Assim, abrir, atualizar e compartilhar uma URL interna funciona no GitHub Pages sem mudar as URLs para fragmentos. Para gerar o pacote localmente, use `npm run build:github-pages`; os arquivos ficam em `dist/ipb-app/browser`.

## Build e verificações

```sh
npm run build
npm test
npm run lint
npm run format:check
npm audit
```

O build de produção fica em `dist/ipb-app/browser`. Para examiná-lo localmente:

```sh
npm run preview
```

Abra `http://127.0.0.1:4175`. Em hospedagens estáticas, configure o fallback das rotas de navegação para `index.html`; arquivos e assets inexistentes devem continuar retornando 404.

Os testes de navegador usam o build de produção e iniciam seu próprio preview na porta 4175, que deve estar livre:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

A suíte cobre regras pedagógicas, serviços HTTP, interceptors, CRUD mockado, conformidade com o OpenAPI, persistência, formulários, histórico, alterações não salvas e teclado. Existem 40 cenários de navegador, executados em desktop e celular (80 execuções), para o único perfil atual de professor. Os cenários executam em Chromium com larguras de 1440 e 390 pixels. A comparação visual verifica cores e geometria dos principais contêineres contra medidas das páginas originais em `tests/visual-baseline.json`; não é uma comparação integral de pixels. Capturas ficam em `.preview/angular-migration/verified`, e o relatório em `playwright-report/index.html`.

## Organização

```text
src/
  app/
    core/
      api/            contratos, interceptors, estado e fonte mock
      auth/           autenticação HTTP, sessão e guards de acesso
      data/           persistência, validação e catálogo demonstrativo
      models/         contratos do domínio pedagógico compartilhado
      navigation/     proteção de alterações não salvas
    features/
      auth/           login
      home/           atalhos de navegação
      classes/        turmas, alunos e regras de acesso às turmas
      lessons/        formulário de aula em três etapas
      attendance/     calendário de frequência e marcações
      assessments/    avaliação por aluno e critério
      history/        consulta, filtros, paginação e detalhes
      coordination/   gestão, criação, edição e arquivamento
    layouts/          navegação lateral e opções da conta
    shared/           feedback, diálogo, página 404 e utilitários
  environments/       alternância mock/api, URL base, timeout e latência
  styles/             SCSS global, tokens e regra responsiva compartilhada
public/assets/        imagens originais
tests/                fluxos de navegador e referência visual
scripts/              preview e verificações de contratos/transporte
docs/                 API_CONTRACTS.md e OpenAPI 3.1
postman/simulations/   teste opcional de transporte HTTP local
```

## Decisões arquiteturais

- Componentes standalone com `OnPush`, Signals e renderização zoneless padrão do Angular. Os templates usam `@if`, `@for`, `@switch`, bindings e eventos Angular.
- Cada funcionalidade tem seus componentes, estilos e, quando há regras/dados próprios, um store injetável. A agregação da auditoria consulta os stores de aula, frequência e avaliação. O serviço de turmas centraliza o acesso às turmas e a exclusão dos registros associados, sem dependências circulares.
- Contratos usados por várias funcionalidades ficam em `core/models`; o catálogo preserva cursos, módulos, professores, critérios e alunos existentes. Formulários de edição usam Reactive Forms tipados. `computed` calcula estados derivados sem acesso ao armazenamento; `effect` só sincroniza a API nativa do diálogo. `toSignal` acompanha mudanças do formulário sem subscriptions manuais.
- Angular Router carrega páginas sob demanda. Guards protegem sessão, existência da turma e saída de formulários alterados; `beforeunload` cobre recarregamento/fechamento. URLs antigas como `/registro-aula.html?turma=6a` continuam funcionando e preservam os parâmetros. Rotas desconhecidas exibem uma página 404.
- SCSS encapsulado mantém os estilos das telas. Tokens centralizam a paleta e os valores globais. Tailwind, Flowbite, scripts de montagem de HTML e arquivos estáticos substituídos foram removidos. Nos celulares, as colunas fixas das tabelas foram ajustadas para permitir acessar as marcações.
- Os componentes usam stores de aplicação, que chamam serviços por domínio com HttpClient. Interceptors funcionais centralizam credenciais, timeout, erros e seleção da fonte. Em modo mock, repositórios preservam as regras e transações da persistência anterior. Em modo api, as mesmas requisições seguem para o servidor. A auditoria continua uma projeção dos snapshots HTTP; não há backend implementado nem repetição automática de mutações.

## Dados e compatibilidade

Foram preservadas as chaves `ipb-turmas-v1`, `ipb-aulas-v1`, `ipb-presencas-v1`, `ipb-avaliacoes-v1`, `ipb-sessao-v1` e `ipb-login-username`, além das chaves de alunos, fixações e avaliações por aula descritas nos contratos. Em modo mock, os dados pedagógicos permanecem no `localStorage`, e a sessão demonstrativa no `sessionStorage`. Em modo api, a sessão é validada por HTTP e os dados vêm do servidor, sem inicialização da demonstração. O formato antigo da frequência indexada diretamente por data também é aceito. Dados demonstrativos são inseridos apenas quando a chave ainda não existe; listas vazias existentes continuam vazias.

Para continuar usando dados de uma instalação anterior, sirva a aplicação na mesma origem (protocolo, host e porta) e no mesmo perfil do navegador. A migração dos arquivos não copia armazenamento entre origens.

As gravações validam a existência e situação da turma, datas e entradas relevantes. Aulas duplicadas por turma/data são rejeitadas. Arquivar preserva o histórico; excluir remove turma e registros associados. Marcas históricas de alunos removidos da turma permanecem consultáveis. Uma falha em gravação composta tenta restaurar os valores anteriores; uma falha nessa restauração é exibida. Dados inválidos são mantidos no armazenamento e sua sobrescrita é bloqueada, com mensagem visível. Para recuperação, preserve/exporte os valores originais antes de corrigi-los e recarregue a aplicação após a correção.

O modo mock padrão é uma demonstração local, sem autenticação em servidor. A credencial pública de teste não representa um segredo. Nenhuma senha é persistida. As fontes Inter e Material Symbols continuam vindo do Google Fonts, como na interface original; requerem rede para sua aparência exata.

O override de `minimatch` para `^11.0.1`, limitado a `@typescript-eslint/typescript-estree`, corrige a dependência transitiva apontada pela auditoria. A compatibilidade foi exercitada pelo lint e pelos testes; remova o override quando o upstream adotar a versão corrigida.
