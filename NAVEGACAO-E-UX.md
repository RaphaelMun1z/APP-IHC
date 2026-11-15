# Navegação e fluxos — IPB APP 1

## Estrutura

O menu principal contém Início, Turmas e Auditoria. O único perfil é Professor, com acesso a todas as funcionalidades. Perfil e Sair permanecem no menu da conta.

| Rota                              | Responsabilidade                                                   |
| --------------------------------- | ------------------------------------------------------------------ |
| `/inicio`                         | Atalhos para Turmas e Auditoria e acesso rápido às turmas fixadas  |
| `/turmas`                         | Listagem, busca e gestão de todas as turmas                        |
| `/turmas/:turma/visao-geral`      | Dados da turma, atividades recentes e arquivamento/reativação      |
| `/turmas/:turma/alunos`           | Matrículas da turma e acesso à gestão                              |
| `/turmas/:turma/alunos/novo`      | Formulário de cadastro de aluno                                    |
| `/turmas/:turma/aulas`            | Lista de aulas e acesso ao registro                                |
| `/turmas/:turma/aulas/nova`       | Editor de aula existente reutilizado                               |
| `/turmas/:turma/aulas/:id/editar` | Edição de aula da turma                                            |
| `/turmas/:turma/registros/:id`    | Detalhes persistentes de aula, frequência ou avaliação             |
| `/turmas/:turma/frequencia`       | Consulta e edição mensal de frequência                             |
| `/turmas/:turma/avaliacoes`       | Consulta e edição de avaliações por data                           |
| `/turmas/:turma/gerenciar`        | Edição da turma, acessada pelo botão ao lado do título             |
| `/historico`                      | Consulta global com filtros, professor e paginação                 |
| `/historico/:id`                  | Detalhes de registro, com retorno à consulta original              |
| `/coordenacao`                    | Rota antiga, redirecionada para `/turmas`                          |
| `/turma-form`                     | Criação de turma e compatibilidade com edição antiga por `?turma=` |

## Fluxos

Salvar uma aula abre seus detalhes. A edição iniciada no Histórico retorna ao registro de origem; o link de retorno desse registro recupera a consulta com os filtros originais. Frequência e avaliações salvam na própria página com confirmação visual, mantendo período/data selecionados. As abas também lembram período/data durante a sessão da aplicação.

Busca de turmas e filtros/página da Auditoria ficam nos parâmetros de consulta. O parâmetro `retorno` transporta a origem contextual, validada contra as rotas internas. Links antigos de `/coordenacao` são redirecionados para `/turmas`, preservando filtros. Links com parâmetros são convertidos em `UrlTree` para preservar sua interpretação como URL. O botão circular Voltar recupera a origem com seu contexto; os breadcrumbs representam exclusivamente a hierarquia da página, independentemente da origem.

## Interface compartilhada

`PageNavigation` calcula a hierarquia, o título e o destino do retorno. `Breadcrumbs` e `PageHeader` exibem esse estado em todas as páginas internas. O layout fornece o único título principal, acima da informação contextual e das abas. O login não utiliza breadcrumbs.

O aside ocupa toda a altura da tela e mantém avatar, nome, perfil e Sair do sistema no rodapé. A viewport e o body ficam limitados a `100dvh`. Os estilos compartilhados em `_workspace.scss` definem páginas, superfícies, filtros externos, tabelas, controles e estados vazios. Listagens extensas rolam em seus próprios containers; formulários e detalhes rolam na superfície de conteúdo. Em telas baixas, a superfície da listagem assume a rolagem da tabela inteira para manter linhas e ações alcançáveis. Os filtros podem ser recolhidos em celulares com pouca altura.

A diretiva `Action` adiciona Material Symbols a links e botões nativos, preservando comportamento de teclado, roteamento e estados desabilitados. Ações de linha usam dimensões uniformes, tooltip e nome acessível. A exclusão é apresentada para turmas, que já possuem essa operação no domínio; os registros pedagógicos mantêm suas ações existentes de consulta e edição.

## Compatibilidade e regras

- As rotas antigas `/registro-aula`, `/presencas`, `/avaliacao`, `/turma-form` e suas variantes `.html` continuam disponíveis com seus parâmetros existentes.
- As chaves, os formatos de armazenamento e os stores de domínio existentes permanecem em uso. Não há migração destrutiva dos registros.
- Guards protegem autenticação, existência da turma e alterações pendentes. O perfil Professor pode acessar e administrar qualquer turma; os stores continuam validando as regras de domínio em cada gravação.
- Turmas arquivadas preservam os registros para consulta e impedem gravações. Arquivamento, reativação e exclusão exigem confirmação.
- Formulários reutilizam `canDeactivate` e proteção de recarregamento. Cancelar o descarte mantém o rascunho e o contexto aplicado.
- No Histórico, professor significa autor registrado em aulas/avaliações; a frequência legada não contém autoria e usa o professor responsável atual pela turma. A interface informa essa diferença.
- A aplicação permanece demonstrativa e local. Google e cadastro estão identificados como indisponíveis; o perfil informa que os dados ficam no navegador.

## Verificação

As listagens tabulares usam o padrão compacto de `_tables.scss`: divisórias discretas, cabeçalhos fixos, ações na última coluna e badges reutilizáveis. `FilterPanel` mantém a busca disponível, abre os campos adicionais e apresenta os filtros aplicados em chips removíveis. A limpeza de período/data retorna ao padrão válido da funcionalidade; em turmas contextuais, a identidade da turma permanece vinculada à rota.

`Pagination` oferece 10, 15, 25 e 50 registros por página, com 10 por padrão, contagem à esquerda e primeira/anterior/próxima/última à direita. A Auditoria mantém tamanho e página na URL; as demais tabelas usam os mesmos tamanhos e controles. Frequência e Avaliações paginam os alunos sem descartar o rascunho dos demais alunos; a gravação continua abrangendo todas as alterações. Os detalhes de frequência e avaliação também são paginados. A superfície permanece fixa, com rolagem somente na região dos registros.

`npm run build`, `npm run lint`, `npm test` e `npm run test:e2e` verificam compilação, regras estáticas, regras de domínio/guards e jornadas reais em Chromium com larguras de desktop e celular. Os testes de navegação cobrem detalhes persistentes, edição, retorno com filtros, acesso do perfil Professor às funcionalidades, formulários com alterações, arquivamento, reativação e ausência de transbordamento horizontal da página.

Os antigos testes de geometria exata foram substituídos por verificações de navegação e responsividade, pois o novo fluxo altera intencionalmente a organização das páginas.
