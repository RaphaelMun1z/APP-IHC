# IPB · APP 1

Aplicação pedagógica em Angular para turmas, registro de aulas, frequência, avaliação observacional, histórico e coordenação. A identidade visual original, os assets e os dados locais foram mantidos.

## Executar

Requer Node.js `^22.22.3`, `^24.15.0` ou `^26.0.0` e npm. O projeto usa Angular **22.2.6**, Angular CLI/build **22.2.7** e TypeScript **6.0**; as versões exatas das dependências estão no `package-lock.json`.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:4173`. `npm start` também inicia o desenvolvimento. Para outra porta: `npx ng serve --host 127.0.0.1 --port 4200`.

O acesso continua demonstrativo: usuário `professor` ou `coordenacao`, senha pública de teste `ipb123`. O professor acessa suas turmas; a coordenação gerencia todas. A opção de lembrar usuário não grava a senha. Google, cadastro e recuperação mantêm as mensagens explicativas existentes; não há integração externa para esses recursos.

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

São 26 testes unitários/de componente e 22 cenários de navegador, cobrindo os dois perfis, persistência, validações, restrições de acesso, formulários, histórico, arquivamento/exclusão, alterações não salvas e teclado. Os cenários executam em Chromium com larguras de 1440 e 390 pixels. A comparação visual verifica cores e geometria dos principais contêineres contra medidas das páginas originais em `tests/visual-baseline.json`; não é uma comparação integral de pixels. Capturas ficam em `.preview/angular-migration/verified`, e o relatório em `playwright-report/index.html`.

## Organização

```text
src/
  app/
    core/
      auth/           sessão demonstrativa e guards de acesso
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
  styles/             SCSS global, tokens e regra responsiva compartilhada
public/assets/        imagens originais
tests/                fluxos de navegador e referência visual
scripts/              preview local do build
```

## Decisões arquiteturais

- Componentes standalone com `OnPush`, Signals e renderização zoneless padrão do Angular. Os templates usam `@if`, `@for`, `@switch`, bindings e eventos Angular.
- Cada funcionalidade tem seus componentes, estilos e, quando há regras/dados próprios, um store injetável. A agregação do histórico consulta os stores de aula, frequência e avaliação. O serviço de turmas centraliza autorização e exclusão dos registros associados, sem dependências circulares.
- Contratos usados por várias funcionalidades ficam em `core/models`; o catálogo preserva cursos, módulos, professores, critérios e alunos existentes. Formulários de edição usam Reactive Forms tipados. `computed` calcula estados derivados sem acesso ao armazenamento; `effect` só sincroniza a API nativa do diálogo. `toSignal` acompanha mudanças do formulário sem subscriptions manuais.
- Angular Router carrega páginas sob demanda. Guards protegem sessão, coordenação e saída de formulários alterados; `beforeunload` cobre recarregamento/fechamento. URLs antigas como `/registro-aula.html?turma=6a` continuam funcionando e preservam os parâmetros. Rotas desconhecidas exibem uma página 404.
- SCSS encapsulado mantém os estilos das telas. Tokens centralizam a paleta e os valores globais. Tailwind, Flowbite, scripts de montagem de HTML e arquivos estáticos substituídos foram removidos. Nos celulares, as colunas fixas das tabelas foram ajustadas para permitir acessar as marcações.
- O serviço de armazenamento fornece sinais somente para leitura e atualiza os stores após gravação bem-sucedida. A interface e as regras pedagógicas ficam separadas da persistência. Uma futura API pode substituir essa camada com contratos explícitos; nenhum backend, endpoint fictício, retry ou biblioteca de estado foi introduzido.

## Dados e compatibilidade

Foram preservadas as chaves `ipb-turmas-v1`, `ipb-aulas-v1`, `ipb-presencas-v1`, `ipb-avaliacoes-v1`, `ipb-sessao-v1` e `ipb-login-username`. Turmas, aulas, frequência e avaliações permanecem no `localStorage`; a sessão permanece no `sessionStorage`. O formato antigo da frequência indexada diretamente por data também é aceito. Dados demonstrativos são inseridos apenas quando a chave ainda não existe; listas vazias existentes continuam vazias.

Para continuar usando dados de uma instalação anterior, sirva a aplicação na mesma origem (protocolo, host e porta) e no mesmo perfil do navegador. A migração dos arquivos não copia armazenamento entre origens.

As gravações validam permissões, turma ativa, datas e entradas relevantes. Aulas duplicadas por turma/data são rejeitadas. Arquivar preserva o histórico; excluir remove turma e registros associados. Marcas históricas de alunos removidos da turma permanecem consultáveis. Uma falha em gravação composta tenta restaurar os valores anteriores; uma falha nessa restauração é exibida. Dados inválidos são mantidos no armazenamento e sua sobrescrita é bloqueada, com mensagem visível. Para recuperação, preserve/exporte os valores originais antes de corrigi-los e recarregue a aplicação após a correção.

Trata-se de uma demonstração local, sem autenticação em servidor. A credencial pública de teste não representa um segredo. Nenhuma senha é persistida. As fontes Inter e Material Symbols continuam vindo do Google Fonts, como na interface original; requerem rede para sua aparência exata.

O override de `minimatch` para `^11.0.1`, limitado a `@typescript-eslint/typescript-estree`, corrige a dependência transitiva apontada pela auditoria. A compatibilidade foi exercitada pelo lint e pelos testes; remova o override quando o upstream adotar a versão corrigida.
