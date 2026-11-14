# Relatório da interface e dos fluxos atuais · IPB APP 1

## Escopo

Este relatório descreve a implementação Angular existente: componentes, templates, rotas, permissões, dados locais e interações implementadas. O acesso é demonstrativo: usuário `professor` ou `coordenacao`, senha pública de teste `ipb123`. Não há autenticação de servidor.

## 1. Páginas

### Login — `/login`

**Propósito:** entrar na demonstração como professor ou coordenação.

**Elementos:** fotografia, marca IPB / APP 1 e mensagem de apresentação; campos Usuário e Senha; opção “Lembrar meu usuário”; botão Entrar; ações “Esqueceu a senha?”, “Continuar com Google”, “Cadastre-se” e “Preencher credenciais de teste”; diálogo de ajuda.

### Início — `/inicio`

**Propósito:** apresentar atalhos para o trabalho pedagógico.

**Elementos:** cartões Minhas turmas, Registrar aula, Frequência, Avaliação e Histórico. A coordenação também vê Coordenação.

### Minhas turmas — `/turmas`

**Propósito:** consultar as turmas acessíveis e permitir que a coordenação as administre.

**Elementos:** busca por nome, contagem e lista de turmas. Abrir uma turma exibe um diálogo com curso, horário e alunos matriculados, além de atalhos para aula, frequência e avaliação. A coordenação vê Nova turma, caixas de seleção, edição e exclusão individual ou em massa. O professor vê suas turmas e pode abrir a relação de alunos.

### Registro de aula — `/registro-aula`

**Propósito:** registrar ou editar uma aula.

**Elementos:** ligação para Histórico; formulário em três etapas; turma, data, curso, módulo, tipo (Regular, Revisão, PR1, PR2 ou PR3), lições, observações opcionais; Voltar, Próxima etapa e Salvar. Depois de salvar, surgem atalhos para frequência e histórico. `?id=...` abre um registro existente; `?turma=...` preseleciona uma turma.

### Frequência — `/presencas`

**Propósito:** consultar e registrar presenças mensais por turma.

**Elementos:** filtros de turma, ano e mês; botão Buscar; legenda; tabela de alunos por dia; resumo de presenças e botão Salvar frequência. As colunas refletem os dias agendados para a turma e datas com registros anteriores. Cada célula alterna entre presente, falta e sem registro. Dias futuros e turmas arquivadas são somente leitura. A rota aceita `?turma=...&data=...`.

### Avaliação observacional — `/avaliacao`

**Propósito:** registrar o desenvolvimento dos alunos em critérios observacionais.

**Elementos:** filtros de turma e data; tabela de alunos por dez critérios; legenda e dois botões Salvar avaliação, no cabeçalho e no rodapé. Cada célula alterna entre Atendeu, Precisa desenvolver e Sem avaliação. Turmas arquivadas ficam somente para consulta. A rota aceita turma e data por parâmetros.

### Histórico — `/historico`

**Propósito:** consultar registros agregados de aula, frequência e avaliação.

**Elementos:** filtros de tipo, turma, intervalo de datas e texto; Buscar e Limpar filtros; tabela de data, tipo, turma, resumo e Abrir; paginação de dez itens; diálogo com detalhes e atalhos para abrir ou editar registros. A rota aceita filtros de tipo e turma pela query string.

### Coordenação pedagógica — `/coordenacao`

**Propósito:** consultar e administrar turmas de todos os professores. Acesso exclusivo da coordenação.

**Elementos:** Nova turma; filtros de nome, professor e situação; tabela com turma, curso, módulo, professor, horário, número de alunos, status e ações Editar e Registros.

### Cadastro/edição de turma — `/turma-form`

**Propósito:** criar ou configurar uma turma. Acesso exclusivo da coordenação.

**Elementos:** nome, professor, curso, módulo, dias, horários, alunos e opção de arquivamento; botões Salvar turma, Cancelar e Voltar às turmas. `?turma=...` seleciona uma turma para edição.

### Página não encontrada

Qualquer rota sem correspondência apresenta “Página não encontrada” e o link Voltar ao início. Rotas internas exigem sessão e seguem o redirecionamento ao login quando necessário.

## 2. Funcionalidades e ações

| Página | O que a pessoa pode fazer |
|---|---|
| Login | Validar as credenciais demonstrativas, iniciar sessão do navegador, lembrar apenas o nome de usuário, preencher credenciais de teste ou abrir mensagens explicativas de ajuda. Google, cadastro e recuperação não iniciam processos reais. |
| Início | Abrir as áreas do aplicativo; a Coordenação aparece apenas no perfil correspondente. |
| Minhas turmas | Buscar turmas e abrir a relação de alunos; iniciar aula, frequência ou avaliação. A coordenação também cria, edita e exclui turmas, individualmente ou em grupo, com confirmação antes de excluir. |
| Registro de aula | Preencher as três etapas, escolher conteúdo e tipo, avançar/voltar, salvar ou editar. Validam-se data, turma ativa, módulo e lições; não se aceita mais de uma aula por turma/data. Alterações pendentes pedem confirmação antes de sair. |
| Frequência | Aplicar filtros de turma/mês/ano, alternar marcações, salvar o mês e consultar o histórico. Alterar filtros ou navegar com rascunho exige confirmação. |
| Avaliação | Aplicar turma/data, alternar o estado de cada aluno/critério, salvar e consultar o histórico. Alterações pendentes exigem confirmação ao trocar filtro ou rota. |
| Histórico | Filtrar, limpar critérios, paginar e abrir detalhes. A partir deles, editar aula ou abrir frequência/avaliação quando a turma estiver ativa. Intervalo de datas invertido exibe erro. |
| Coordenação | Pesquisar e filtrar por professor e status; abrir cadastro/edição e histórico filtrado da turma. |
| Cadastro/edição de turma | Configurar dados, agenda e alunos; selecionar/limpar todos; arquivar ou reativar; validar nome duplicado, dias, horário e matrícula; salvar ou cancelar. Alterações pendentes são protegidas. |
| Menu de conta | Consultar perfil demonstrativo, ir a Minhas turmas ou sair da conta. O guard preserva a sessão se a pessoa cancelar o descarte de alterações. |

Dados e erros ficam no navegador. Turmas, aulas, frequência e avaliações usam `localStorage`; a sessão usa `sessionStorage`. As chaves legadas foram preservadas e dados demonstrativos são inseridos apenas quando a chave ainda não existe. Professor consulta as turmas atribuídas a si; coordenação acessa todas. Arquivar preserva o histórico e impede novos registros; excluir turma remove também os registros associados. Falha de leitura é informada e preserva os dados armazenados.

## 3. Navegação e jornadas atuais

A moldura de todas as páginas internas oferece navegação lateral para Início, Turmas, Registro de aula, Frequência, Avaliação e Histórico. Coordenação aparece para o perfil coordenador. O avatar abre perfil e saída da conta. No celular, os nomes ficam abreviados visualmente, mantendo rótulos acessíveis.

As conexões explícitas são:

- **Início →** turmas, aula, frequência, avaliação e histórico; **coordenação → gestão**.
- **Turmas → diálogo dos alunos →** aula, frequência ou avaliação; coordenação → cadastro, edição e exclusão.
- **Aula → Histórico**; após salvar → frequência da turma/data ou histórico.
- **Histórico →** detalhes; aula → editar; frequência/avaliação → abrir na turma/data.
- **Coordenação →** criar/editar turma e abrir histórico filtrado da turma.
- **Login →** destino solicitado quando a rota é autorizada ao perfil. Acesso do professor à coordenação retorna a Início.

Principais jornadas implementadas:

1. Professor: Login → Início/Turmas → Registro de aula (3 etapas) → salvar → Frequência ou Histórico.
2. Professor: Turmas → selecionar turma → Frequência → mês → marcar alunos → salvar → Histórico.
3. Professor: Início/Turmas → Avaliação → turma/data → marcar critérios → salvar → Histórico.
4. Professor: Histórico → filtros → detalhes → editar aula ou abrir frequência/avaliação.
5. Coordenação: Login → Coordenação/Turmas → criar/editar configuração e matrícula → salvar; opcionalmente arquivar ou consultar histórico.

Rotas antigas com sufixo `.html` são redirecionadas às rotas Angular, preservando os parâmetros da URL.

## 4. Lacunas e funcionalidades incompletas

### Ações que não concluem uma tarefa

- Recuperação de senha, login Google e cadastro apenas abrem mensagens explicativas; não existem processos, páginas ou integrações reais para concluí-los.
- Meu perfil exibe nome, perfil demonstrativo e explicação sobre os dados locais; não permite editar informações.
- “Ver registros” da coordenação abre o Histórico filtrado por turma, sem painel analítico próprio.

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

O APP 1 é uma ferramenta pedagógica de demonstração para organizar turmas e acompanhar estudantes. O professor registra conteúdo ministrado, presença e observações de desenvolvimento; o Histórico reúne os registros. A coordenação configura turmas, curso/módulo, professor responsável, agenda e alunos, além de poder arquivar turmas.

O catálogo de demonstração contém dois cursos, quatro módulos, dois professores, quatro turmas, quinze estudantes e dez critérios de avaliação. Os registros são locais ao navegador e à origem da aplicação. A jornada central é acompanhar uma turma ao longo do tempo por aula, frequência e avaliação; a coordenação prepara e mantém a estrutura em que essa jornada ocorre.

## Referências da implementação

- Rotas e guards: `src/app/app.routes.ts`, `src/app/core/auth/auth.guards.ts`.
- Navegação global: `src/app/layouts/app-layout.html` e `src/app/layouts/app-layout.ts`.
- Funcionalidades: `src/app/features/`.
- Catálogo/dados de demonstração: `src/app/core/data/catalog.ts`, `src/app/core/data/demo-data.ts`.
- Fluxos de navegador cobertos: `tests/app.spec.ts`.
