# Relatório da interface e dos fluxos atuais · IPB APP 1

## Escopo

Este relatório descreve a implementação Angular existente: componentes, templates, rotas, permissões, dados locais e interações implementadas. O acesso é demonstrativo: existe apenas o perfil Professor, com todas as funcionalidades. Credenciais de teste: usuário `professor` e senha pública `ipb123`. Não há autenticação de servidor.

## 1. Páginas

### Login — `/login`

**Propósito:** entrar na demonstração com o perfil Professor.

**Elementos:** fotografia, marca IPB / APP 1 e mensagem de apresentação; campos Usuário e Senha; opção “Lembrar meu usuário”; botão Entrar; ações “Esqueceu a senha?”, “Continuar com Google”, “Cadastre-se” e “Preencher credenciais de teste”; diálogo de ajuda.

### Início — `/inicio`

**Propósito:** apresentar atalhos para o trabalho pedagógico.

**Elementos:** atalhos para Turmas e Auditoria e uma área de turmas fixadas. Cada turma fixada abre sua visão geral; sem fixações, a página orienta a escolher turmas para acesso rápido.

### Minhas turmas — `/turmas`

**Propósito:** consultar e administrar todas as turmas.

**Elementos:** busca por nome, contagem, filtros e tabela de turmas, com ações para abrir, editar, excluir e fixar/desafixar. As turmas fixadas aparecem na tela inicial. Dentro de uma turma, o cabeçalho contextual exibe o título junto ao botão Voltar; **Editar turma** aparece na mesma linha, sem repetir o nome da turma. As abas ficam reservadas para Visão geral, Alunos e Aulas. O cadastro de aluno abre um formulário de página inteira no padrão do registro de aula. Na lista de aulas, cada item oferece ações para abrir/editar o registro, realizar a chamada no mês da aula e avaliar os alunos daquela aula.

### Registro de aula — `/registro-aula`

**Propósito:** registrar ou editar uma aula e acessar seus detalhes, frequência e avaliações.

**Elementos:** formulário multi-step de três etapas com timeline vertical ampliada à esquerda; campos empilhados a partir do topo, com títulos centralizados e destacados e opções de turma, curso, módulo, tipo e lições em tags maiores e selecionáveis; data e observações em campos de texto. A navegação permite retornar a etapas concluídas e valida os campos antes de avançar. Continuar fica centralizado com o ícone à direita, e Voltar aparece logo abaixo. Depois de salvar, surgem atalhos para frequência e histórico. `?id=...` abre um registro existente; `?turma=...` preseleciona uma turma. A listagem oferece busca por conteúdo e filtros de tipo e período. Ao abrir uma aula específica, a aba principal **Aulas** permanece selecionada e uma navegação interna oferece **Aula**, **Frequência** e **Avaliações**; a visão geral organiza data, turma, tipo e curso/módulo em cartões, mostra os conteúdos como tags e posiciona Editar junto às abas somente na visão geral; frequência abre a grade mensal no mês da aula, sem filtro de período nem subtítulo, e avaliações abre os critérios vinculados àquela aula, sem botão de retorno ou subtítulo. Nas duas telas, **Salvar alterações** aparece no rodapé quando há mudanças pendentes.

### Frequência — `/presencas`

**Propósito:** consultar e registrar presenças mensais por turma.

**Elementos:** nas rotas gerais, filtros de turma, ano e mês; botão Buscar; legenda; tabela de alunos por dia; resumo de faltas e botão **Salvar alterações** no rodapé quando há mudanças pendentes. As colunas refletem os dias agendados para a turma e datas com registros anteriores. Cada célula alterna entre presente, falta e sem registro. Dias futuros e turmas arquivadas são somente leitura. Na aba Frequência dentro de uma aula, o período é definido pela data da aula selecionada e os filtros de período são ocultados. A rota aceita `?turma=...&data=...`.

### Avaliação observacional — `/avaliacao`

**Propósito:** registrar o desenvolvimento dos alunos em critérios observacionais.

**Elementos:** lista de aulas disponíveis para avaliação e tabela de alunos por dez critérios na aula selecionada; legenda e botão **Salvar alterações** no rodapé quando há mudanças pendentes. Cada célula alterna entre Atendeu, Precisa desenvolver e Sem avaliação. Avaliações são associadas a uma aula; a aba Avaliações nos detalhes da aula abre sua avaliação. Registros antigos sem aula correspondente são preservados e sinalizados. Turmas arquivadas ficam somente para consulta. Rotas antigas com turma/data continuam sendo resolvidas quando há uma aula correspondente.

### Histórico — `/historico`

**Propósito:** consultar registros agregados de aula, frequência e avaliação.

**Elementos:** filtros de tipo, turma, intervalo de datas e texto; Buscar e Limpar filtros; tabela de data, tipo, turma, resumo e Abrir; paginação de dez itens; diálogo com detalhes e atalhos para abrir ou editar registros. A rota aceita filtros de tipo e turma pela query string.

### Cadastro/edição de turma — `/turma-form`

**Propósito:** criar ou configurar uma turma a partir da página Turmas.

**Elementos:** formulário multi-step de três etapas preenchendo a área disponível, com timeline vertical ampliada à esquerda: dados da turma (nome, professor, curso e módulo), horários (dias e período) e alunos (matrículas e opção de arquivamento). Os campos começam no topo, ficam centralizados e têm títulos destacados; opções como professor, curso, módulo, dias e alunos são tags maiores e selecionáveis. As etapas futuras ficam indisponíveis até o avanço válido; etapas já concluídas podem ser revisitadas. Continuar centralizado com ícone à direita; Voltar centralizado logo abaixo; Salvar turma na etapa final. `?turma=...` seleciona uma turma para edição.

### Página não encontrada

Qualquer rota sem correspondência apresenta “Página não encontrada” e o link Voltar ao início. Rotas internas exigem sessão e seguem o redirecionamento ao login quando necessário.

A rota legada `/coordenacao` redireciona para a listagem padrão `/turmas`.

## 2. Funcionalidades e ações

| Página                   | O que a pessoa pode fazer                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login                    | Validar as credenciais demonstrativas, iniciar sessão do navegador, lembrar apenas o nome de usuário, preencher credenciais de teste ou abrir mensagens explicativas de ajuda. Google, cadastro e recuperação não iniciam processos reais.                                                                               |
| Início                   | Abrir as áreas do aplicativo, incluindo Turmas e Auditoria.                                                                                                                                                                                                                                                              |
| Turmas                   | Buscar, filtrar, criar, editar e excluir turmas, individualmente ou em grupo, com confirmação antes de excluir; abrir a relação de alunos e iniciar aula, frequência ou avaliação.                                                                                                                                       |
| Registro de aula         | Preencher as três etapas com timeline lateral, campos empilhados e opções em tags; avançar/voltar, salvar ou editar; na lista, filtrar por conteúdo, tipo e período. Validam-se data, turma ativa, módulo e lições; não se aceita mais de uma aula por turma/data. Alterações pendentes pedem confirmação antes de sair. |
| Frequência               | Nas rotas gerais, aplicar filtros de turma/mês/ano; dentro de uma aula, usar o mês da aula selecionada sem filtros de período. Alternar marcações, salvar e consultar o histórico. Alterar filtros ou navegar com rascunho exige confirmação.                                                                            |
| Avaliação                | Aplicar turma/data, alternar o estado de cada aluno/critério, salvar e consultar o histórico. Alterações pendentes exigem confirmação ao trocar filtro ou rota.                                                                                                                                                          |
| Histórico                | Filtrar, limpar critérios, paginar e abrir detalhes. A partir deles, editar aula ou abrir frequência/avaliação quando a turma estiver ativa. Intervalo de datas invertido exibe erro.                                                                                                                                    |
| Cadastro/edição de turma | Configurar dados, agenda e alunos em etapas com timeline lateral e opções em tags; selecionar/limpar todos; arquivar ou reativar; validar nome duplicado, dias, horário e matrícula; salvar ou cancelar. Alterações pendentes são protegidas.                                                                            |
| Menu de conta            | Consultar perfil demonstrativo, ir a Minhas turmas ou sair da conta. O guard preserva a sessão se a pessoa cancelar o descarte de alterações.                                                                                                                                                                            |

Dados e erros ficam no navegador. Turmas, aulas, frequência e avaliações usam `localStorage`; a sessão usa `sessionStorage`. As chaves legadas foram preservadas e dados demonstrativos são inseridos apenas quando a chave ainda não existe. O perfil Professor consulta e administra todas as turmas. Arquivar preserva o histórico e impede novos registros; excluir turma remove também os registros associados. Falha de leitura é informada e preserva os dados armazenados.

## 3. Navegação e jornadas atuais

A moldura de todas as páginas internas oferece navegação para Início, Turmas e Auditoria. O avatar abre perfil e saída da conta. No celular, os nomes ficam abreviados visualmente, mantendo rótulos acessíveis.

As conexões explícitas são:

- **Início →** turmas e auditoria.
- **Turmas →** filtros, cadastro, edição, exclusão e diálogo dos alunos → aula, frequência ou avaliação.
- **Aula registrada → Aulas permanece selecionada → abas internas →** detalhes, frequência mensal no mês da aula ou avaliação daquela aula; detalhes também permitem editar o registro.
- **Histórico →** detalhes; aula → editar; frequência/avaliação → abrir na turma/data.
- **Turmas →** criar/editar turma e abrir auditoria filtrada por turma.
- **Login →** destino solicitado após autenticação do perfil Professor.

Principais jornadas implementadas:

1. Professor: Login → Início/Turmas → Registro de aula (3 etapas) → salvar → Frequência ou Histórico.
2. Professor: Turmas → Aulas → abrir aula → aba Frequência → marcar alunos no mês da aula → salvar → Histórico.
3. Professor: Turmas → Aulas → abrir aula → aba Avaliações → marcar critérios → salvar → Histórico.
4. Professor: Histórico → filtros → detalhes → editar aula ou abrir frequência/avaliação.
5. Professor: Login → Turmas → criar/editar configuração e matrícula → salvar; opcionalmente arquivar ou consultar auditoria.

Rotas antigas com sufixo `.html` são redirecionadas às rotas Angular, preservando os parâmetros da URL.

## 4. Lacunas e funcionalidades incompletas

### Ações que não concluem uma tarefa

- Recuperação de senha, login Google e cadastro apenas abrem mensagens explicativas; não existem processos, páginas ou integrações reais para concluí-los.
- Meu perfil exibe nome, perfil demonstrativo e explicação sobre os dados locais; não permite editar informações.
- A ação “Registros” na tabela de Turmas abre a Auditoria filtrada por turma, sem painel analítico próprio.

### Áreas que não existem

- Não existem área do aluno ou família, gestão de alunos independente das turmas, gestão de cursos/módulos ou cadastro independente de professores.
- Não há página exclusiva de detalhes do registro: os detalhes ficam em modal no Histórico.
- Não há indicadores ou relatórios, exportação, impressão, notificações, pesquisa global ou integração de dados entre dispositivos.
- Não há API/backend, autenticação de produção, identidade federada ou recuperação real de conta. A senha é pública e os perfis são demonstrativos.

### Pontos de descontinuidade e UX

- O link “Ver histórico” da aula abre o histórico geral, sem carregar automaticamente a turma ou o registro editado.
- A relação de alunos e atalhos da turma vivem em modal; não há uma página persistente de detalhes da turma reunindo dados e ações.
- Turma arquivada mantém os registros consultáveis, mas as ações de edição/abertura desses registros são condicionadas à turma ativa.
- Excluir turma remove permanentemente seus registros locais. Não existe desfazer.
- Frequência e avaliação usam tabelas extensas com rolagem horizontal em celular; não há visualização alternativa focada em um aluno ou uma data.
- Marcar presença e critério exige ciclo de três estados no mesmo botão. A legenda explica os estados, mas não há controles separados.
- Frequência aplica filtros com Buscar. Avaliação aplica a turma/data ao mudar o controle e pode pedir confirmação. O comportamento difere entre essas páginas.
- Avaliação repete o botão Salvar no cabeçalho e rodapé; não há indicador explícito de progresso/estado salvo por aluno.
- Dias de frequência são derivados do calendário da turma e dos registros existentes. Não há ação para criar uma aula/frequência excepcional a partir da própria grade.
- O texto buscado no Histórico considera resumo e observações de aula; não busca dentro das marcações de frequência ou avaliações.
- 404 apresenta retorno a Início, que exige sessão; uma pessoa sem sessão acabará no Login pelo guard.

## 5. Contexto e objetivo

O APP 1 é uma ferramenta pedagógica de demonstração para organizar turmas e acompanhar estudantes. O professor registra conteúdo ministrado, presença e observações de desenvolvimento; a Auditoria reúne os registros. O perfil Professor configura turmas, curso/módulo, professor responsável, agenda e alunos, além de poder arquivar turmas.

O catálogo de demonstração contém dois cursos, quatro módulos, dois professores, quatro turmas, quinze estudantes e dez critérios de avaliação. Os registros são locais ao navegador e à origem da aplicação. A jornada central é acompanhar uma turma ao longo do tempo por aula, frequência e avaliação; o professor prepara e mantém a estrutura em que essa jornada ocorre.

## Referências da implementação

- Rotas e guards: `src/app/app.routes.ts`, `src/app/core/auth/auth.guards.ts`.
- Navegação global: `src/app/layouts/app-layout.html` e `src/app/layouts/app-layout.ts`.
- Funcionalidades: `src/app/features/`.
- Catálogo/dados de demonstração: `src/app/core/data/catalog.ts`, `src/app/core/data/demo-data.ts`.
- Fluxos de navegador cobertos: `tests/app.spec.ts`.
