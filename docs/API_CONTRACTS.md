# API REST — IPB APP 1

Contrato proposto a partir do frontend existente, implementado em `src/app/core/api/contracts.ts`, nos serviços `*.api.ts` e no interceptor mock. A especificação formal é [openapi.yaml](openapi.yaml), OpenAPI 3.1. Não existe backend implementado neste projeto.

## Escopo observado e decisões pendentes

O único perfil implementado é `professor`. Ele acessa todas as turmas, incluindo as de outro professor, e pode criar, editar, arquivar, reativar e excluir turmas. O diretório `coordination` contém a gestão existente, mas não define outro perfil. Não se introduziu uma permissão de coordenador ou restrição de propriedade que não existia no código.

| Funcionalidade atual                                   | Origem HTTP                                      |
| ------------------------------------------------------ | ------------------------------------------------ |
| Login, sessão, saída                                   | `/auth/session`                                  |
| Professores, cursos, módulos, lições e critérios       | `/catalogo`, somente leitura                     |
| Turmas e gestão administrativa                         | `/turmas`                                        |
| Fixações na página inicial                             | `/turmas/fixadas` e `/turmas/{turmaId}/fixacao`  |
| Cadastro de aluno, edição do nome, matrícula e remoção | `/alunos` e `/turmas/{turmaId}/alunos`           |
| Registro e edição de aulas                             | `/aulas`                                         |
| Frequência e chamadas históricas                       | `/frequencias` e `/turmas/{turmaId}/frequencias` |
| Avaliação observacional por aula e legados             | `/avaliacoes` e `/aulas/{aulaId}/avaliacao`      |
| Auditoria, detalhes, contadores de faltas e consultas  | Projeções locais dos snapshots HTTP acima        |

Histórico não é um log de segurança imutável: é a união atual dos registros de aulas, chamadas com pelo menos uma marca e avaliações vinculadas. Excluir uma turma remove esses registros. Não foi inventado um endpoint de auditoria com semântica diferente. Seus IDs existentes são o ID da aula, `frequencia-{turmaId}-{data}` e `avaliacao-{turmaId}-{data}`.

São **propostas pendentes de validação com o backend**: caminhos REST, envelope de listas, códigos de erro, autenticação por cookie, nome do cookie, expiração/renovação, proteção CSRF, política CORS, escopo de fixações por usuário, fuso horário do servidor, concorrência entre dispositivos, paginação no servidor e estratégia de importação dos dados demonstrativos. Essas propostas já são usadas como contrato técnico pelo frontend, mas não representam decisões acordadas com um backend existente.

Não foram criados endpoints para funcionalidades apenas anunciadas: Google, recuperação de senha, cadastro de conta, gestão de usuários/professores, CRUD de cursos/módulos/critérios, exclusão isolada de aulas/avaliações ou matrícula de um aluno existente por um fluxo novo. O formulário atual de turma já seleciona alunos existentes pelo campo `alunoIds`.

## Arquitetura e funcionamento

Fluxo: componente → store de aplicação → serviço HTTP do domínio → `HttpClient` → interceptors funcionais → backend **ou** mock. Os componentes não importam catálogo demonstrativo, repositórios mock ou persistência pedagógica.

- `core/api/contracts.ts` reutiliza os modelos existentes para DTOs, define requests, listas, filtros e erros.
- `features/*/*.api.ts`, `core/auth/auth.api.ts` e `core/api/catalog.api.ts` constroem as requisições.
- Stores mantêm projeções Signals em `DataState`; mutações usam RxJS e só atualizam o cache após resposta de sucesso.
- `BootstrapService` carrega os sete snapshots com `forkJoin`, publica o conjunto completo e evita cargas concorrentes. Formulários e guards recebem dados antes de sua criação. Falha inicial exibe mensagem e ação de tentar novamente, sem apresentar um vazio como se fosse sucesso.
- `apiInterceptor` aplica credenciais, timeout, contador de requisições, normalização de erros e invalidação em 401. Não modifica requisições fora da base configurada.
- `mockInterceptor` intercepta apenas a base exata e seus descendentes quando `mode='mock'`. Modo `api` encaminha ao transporte HTTP e não inicializa dados demonstrativos.
- `core/api/mock` contém roteamento, sessão demonstrativa e repositórios com as regras anteriores. Apenas essa fonte usa o armazenamento pedagógico local. `core/data` preserva catálogo, dados de demonstração, validadores e transações locais.
- A UI mantém tabelas, filtros, estados vazios e feedback existentes. Um indicador global cobre todas as requisições; enquanto uma mutação está em andamento, a área da aplicação fica `inert`, evitando cliques, edição e navegação que perderiam rascunhos. `RequestState` também rejeita submissões concorrentes por código. A mensagem de sucesso e a navegação ocorrem depois da confirmação da operação.

O bloqueio de submissões é local à instância do navegador. Não é uma garantia de idempotência de POST entre abas/dispositivos. Não há repetição automática de mutações. Um timeout real pode ocorrer depois de o servidor gravar; consulte os dados antes de reenviar. Apenas a fixação PATCH define explicitamente um estado idempotente.

## Configuração e conexão futura

Edite **somente** `src/environments/environment.ts`. A configuração é compartilhada pelos builds de desenvolvimento, produção e GitHub Pages:

```ts
api: {
  mode: 'api', // 'mock' mantém a demonstração sem backend
  baseUrl: 'https://backend.exemplo/api/v1',
  timeoutMs: 15000,
  mock: { latencyMs: 250, failureStatus: null },
}
```

Com `baseUrl` já configurada para o servidor, a alternância exige mudar apenas `mode`. Recompile e publique normalmente; não há alterações em componentes, stores ou contratos. A URL não deve conter query ou fragmento. A barra final é opcional. A base padrão `/api/v1` é relativa à origem, inclusive em hospedagem sob subdiretório; nesse caso use uma URL absoluta se o backend estiver em outra origem. Não coloque segredos nos arquivos de ambiente Angular: eles são públicos no bundle.

Implemente os endpoints abaixo e valide os exemplos da especificação. Para cookie entre origens, o servidor deve permitir a origem concreta da aplicação com credenciais e os métodos/headers usados. O transporte envia `withCredentials: true`. Não retorna nem persiste access token; cookie HttpOnly e a política CSRF precisam ser definidos pelo backend antes da conexão. No mesmo domínio, o HttpClient mantém seu comportamento padrão de XSRF; autenticação e proteção entre origens precisam ser acordadas e verificadas no servidor.

O modo `api` valida a sessão em `GET /auth/session` antes de abrir uma área protegida, sem aceitar `ipb-sessao-v1` como prova de autenticação. Um 401 limpa sessão e cache em memória, mostrando a necessidade de entrar novamente. Um erro de rede ao restaurar a sessão não é tratado como credencial válida. O backend deve validar autorização em todas as operações; guards no frontend são apenas controle de navegação.

## Convenções HTTP, filtros e paginação

- Base padrão: `/api/v1`; JSON UTF-8 em requests e responses com corpo. IDs são strings opacas, codificadas em segmentos de rota. Não se pressupõe UUID para registros existentes.
- Requests completos de turma e aula usam PUT; presença usa PATCH de mesclagem; nome do aluno e fixação usam PATCH; avaliação usa PUT com todo o conjunto atual de alunos.
- Criação de turma, aluno+matrícula e aula retorna 201. Demais leituras/edições retornam 200. Exclusão em lote de turmas e logout retornam 204 sem corpo. A exclusão de matrícula retorna 200 com a turma atualizada.
- Listas retornam `{ "items": [], "total": 0 }`. `total` é o comprimento do snapshot completo. Não há truncamento silencioso nem parâmetros de página no contrato atual. `/avaliacoes` usa um envelope próprio por conter legados e aviso de migração.
- O único query parameter HTTP implementado é `turmaId` opcional em `GET /aulas`. A UI normalmente carrega todas as aulas. Nenhum outro endpoint possui filtros de query.
- Busca, filtros, paginação e ordenação atuais continuam no cliente: nome/professor/curso/situação das turmas; turma/tipo/período/conteúdo/professor no histórico; mês/ano da frequência. Parâmetros do Angular Router, como `pagina`, `limite` e `retorno`, não são query parameters da API.
- Ordenação da auditoria: data decrescente, depois título. Não há `sort` HTTP. A ordem dos snapshots não deve ser usada como critério de negócio; fixações preservam a ordem explícita dos IDs.
- Datas são `YYYY-MM-DD`, sem timezone; o frontend compara com o dia local. Metadados novos usam timestamps ISO 8601. O fuso do backend deve ser validado antes de impor limites por dia.
- DELETE `/turmas` recebe `{ "ids": [...] }`, preservando a exclusão múltipla atômica existente; infraestrutura intermediária precisa aceitar corpo em DELETE. Não equivale a várias exclusões parciais.

## Erros e falhas simuladas

O corpo HTTP padrão é:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Confira os campos informados.",
  "details": {
    "nome": ["Informe um nome válido."]
  }
}
```

`code` e `message` são obrigatórios. `details` é opcional, previsto para erros por campo e preservado pelo interceptor; o mock atual retorna mensagens sem `details`. A UI atual exibe `message` no feedback existente.

| Status  | Significado                                                                                  |
| ------- | -------------------------------------------------------------------------------------------- |
| 400     | Estrutura/tipos de request inválidos; `INVALID_REQUEST`                                      |
| 401     | Login inválido (`INVALID_CREDENTIALS`) ou sessão ausente (`UNAUTHENTICATED`)                 |
| 403     | Previsto para restrições futuras do backend; não ocorre com o único perfil atual do mock     |
| 404     | Recurso/matrícula ausente (`DOMAIN_ERROR`), ou endpoint não implementado (`NOT_FOUND`)       |
| 409     | Unicidade (`CONFLICT`) ou turma arquivada (`CLASS_ARCHIVED`)                                 |
| 422     | Validação pedagógica (`DOMAIN_ERROR`), inclusive remoção do último aluno                     |
| 500/503 | Falha simulada (`MOCK_FAILURE`); falha de armazenamento pode retornar 503 com `DOMAIN_ERROR` |

O interceptor converte erros em `ApiFailure`, com `status`, `body.code`, `body.message` e `body.details`. Falhas de rede têm status 0; timeout local tem código `TIMEOUT`; 0 não é um código HTTP recebido. Respostas sem o envelope esperado, inclusive HTML de proxy, recebem uma mensagem segura de fallback. Nenhum interceptor mostra detalhes técnicos do proxy ao usuário.

Para simular indisponibilidade, altere `environment.api.mock.failureStatus` para `0`, `500` ou `503`; `null` volta ao comportamento normal. `latencyMs` simula atraso antes da execução, inclusive em falhas, e `timeoutMs` cancela a assinatura. Falha injetada acontece antes da mutação e não persiste dados. Esses controles são usados somente em modo mock. Erros naturais também são verificáveis enviando credenciais inválidas, IDs inexistentes, nome vazio, turma arquivada ou aula duplicada. Não há falhas aleatórias que tornem o desenvolvimento imprevisível.

## Relacionamentos, persistência e regras do backend

`SchoolClass.cursoId` referencia `Course.id`; `moduloId` pertence a esse curso, `professorId` referencia o catálogo de professores, e `alunoIds` referencia o cadastro global de alunos. Uma aula referencia turma, curso e módulo; seu curso/módulo pode ser diferente do padrão da turma porque o formulário atual permite essa escolha. Avaliação referencia o ID da aula. Frequência continua vinculada a turma/data, independentemente de existir aula nessa data.

Os metadados das aulas e avaliações são gerados no servidor. Editar aula preserva o professor original; salvar avaliação registra o professor atual. Nome dentro de uma avaliação é um snapshot histórico; editar o cadastro do aluno não reescreve avaliações anteriores. Nomes não são identificadores e não há unicidade de nome de aluno.

Criação de aluno+matrícula, migração de avaliações e exclusão de turma com suas dependências exigem transação no backend. Excluir matrícula não exclui aluno nem suas marcas antigas. Ao salvar frequência ou avaliação, marcas de alunos removidos são preservadas. Arquivar turma impede novas gravações pedagógicas/matrículas, mas mantém consultas, gestão, reativação e exclusão.

As regras detalhadas por operação abaixo provêm dos stores anteriores. Validações adicionais — conflito de horários, capacidade, obrigatoriedade de critérios, unicidade de nomes de alunos, propriedade exclusiva do professor ou horário estritamente entre 00:00 e 23:59 — não foram acrescentadas. O padrão de horário existente aceita dois pares de dígitos e compara início/fim; endurecer essa regra é decisão futura.

No mock permanecem as chaves `ipb-alunos-v1`, `ipb-turmas-v1`, `ipb-turmas-fixadas-v1`, `ipb-aulas-v1`, `ipb-presencas-v1`, `ipb-avaliacoes-v1`, `ipb-avaliacoes-aulas-v1`, `ipb-sessao-v1` e `ipb-login-username`. Dados demonstrativos só são inseridos quando a chave não existe; listas vazias continuam vazias. Sessão fica em sessionStorage; a opção de lembrar usuário grava somente seu nome. Em modo api, apenas essa preferência opcional continua local; os dados pedagógicos vêm do servidor e o modo não apaga a demonstração existente.

Preserva-se frequência antiga indexada diretamente por data, interpretada como turma `6a`. Avaliações legadas por turma/data são vinculadas à aula correspondente; as sem aula permanecem em `legadasSemAula`. Migração malsucedida preserva os originais e avisa. Alterações compostas usam restauração dos valores anteriores em caso de falha; corrupção bloqueia sobrescrita. Dados locais não são enviados automaticamente ao backend. Para importar depois, é necessário definir um processo próprio de migração com validação dos responsáveis.

## DTOs

Os campos e exemplos a seguir derivam da especificação formal. Campo obrigatório significa que integra o documento JSON completo enviado/recebido; strings opcionais na experiência, como `notas`, podem ser vazias. As regras de trim e unicidade dependem da validação de domínio descrita em cada operação.

### Person

| Campo | Tipo   | Obrigatório | Descrição                                |
| ----- | ------ | ----------- | ---------------------------------------- |
| id    | string | Sim         | Identificador opaco; não pressupor UUID. |
| nome  | string | Sim         | Nome de exibição.                        |

### Student

| Campo | Tipo   | Obrigatório | Descrição       |
| ----- | ------ | ----------- | --------------- |
| id    | string | Sim         | ID opaco.       |
| nome  | string | Sim         | Nome após trim. |

### Session

| Campo  | Tipo   | Obrigatório | Descrição        |
| ------ | ------ | ----------- | ---------------- |
| id     | string | Sim         | ID do usuário.   |
| nome   | string | Sim         | Nome do usuário. |
| perfil | string | Sim         |                  |

### LoginRequest

| Campo    | Tipo   | Obrigatório | Descrição                                             |
| -------- | ------ | ----------- | ----------------------------------------------------- |
| username | string | Sim         | No mock: professor; trim e comparação sem maiúsculas. |
| password | string | Sim         | No mock: credencial pública ipb123.                   |

### StudentRequest

| Campo | Tipo   | Obrigatório | Descrição                                         |
| ----- | ------ | ----------- | ------------------------------------------------- |
| nome  | string | Sim         | Nome após trim deve ter entre 1 e 100 caracteres. |

### CourseModule

| Campo  | Tipo          | Obrigatório | Descrição              |
| ------ | ------------- | ----------- | ---------------------- |
| id     | string        | Sim         | ID do módulo no curso. |
| nome   | string        | Sim         | Nome do módulo.        |
| licoes | Array<string> | Sim         |                        |

### Course

| Campo   | Tipo                | Obrigatório | Descrição      |
| ------- | ------------------- | ----------- | -------------- |
| id      | string              | Sim         | ID do curso.   |
| nome    | string              | Sim         | Nome do curso. |
| modulos | Array<CourseModule> | Sim         |                |

### Catalog

| Campo       | Tipo          | Obrigatório | Descrição |
| ----------- | ------------- | ----------- | --------- |
| cursos      | Array<Course> | Sim         |           |
| professores | Array<Person> | Sim         |           |
| criterios   | Array<Person> | Sim         |           |

### ClassRequest

| Campo       | Tipo           | Obrigatório | Descrição                                                                                       |
| ----------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| nome        | string         | Sim         | Nome após trim, de 1 a 60 caracteres. Único sem distinguir maiúsculas no locale pt-BR.          |
| cursoId     | string         | Sim         | Curso existente no catálogo.                                                                    |
| moduloId    | string         | Sim         | Módulo pertencente ao curso.                                                                    |
| professorId | string         | Sim         | Professor existente no catálogo.                                                                |
| dias        | Array<integer> | Sim         | 0 domingo a 6 sábado; duplicatas são removidas.                                                 |
| inicio      | string         | Sim         | Horário inicial.                                                                                |
| fim         | string         | Sim         | Horário final, posterior ao inicial pela comparação HH:mm.                                      |
| ativa       | boolean        | Sim         | Arquivada permite consulta, gestão e exclusão, mas bloqueia gravações pedagógicas e matrículas. |
| alunoIds    | Array<string>  | Sim         | Ao menos um aluno. Duplicatas são removidas.                                                    |

### SchoolClass

| Campo       | Tipo           | Obrigatório | Descrição                                                                                       |
| ----------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| id          | string         | Sim         | ID gerado pelo servidor; IDs demonstrativos são preservados.                                    |
| nome        | string         | Sim         | Nome após trim, de 1 a 60 caracteres. Único sem distinguir maiúsculas no locale pt-BR.          |
| cursoId     | string         | Sim         | Curso existente no catálogo.                                                                    |
| moduloId    | string         | Sim         | Módulo pertencente ao curso.                                                                    |
| professorId | string         | Sim         | Professor existente no catálogo.                                                                |
| dias        | Array<integer> | Sim         | 0 domingo a 6 sábado; duplicatas são removidas.                                                 |
| inicio      | string         | Sim         | Horário inicial.                                                                                |
| fim         | string         | Sim         | Horário final, posterior ao inicial pela comparação HH:mm.                                      |
| ativa       | boolean        | Sim         | Arquivada permite consulta, gestão e exclusão, mas bloqueia gravações pedagógicas e matrículas. |
| alunoIds    | Array<string>  | Sim         | Ao menos um aluno. Duplicatas são removidas.                                                    |

### ClassList

| Campo | Tipo               | Obrigatório | Descrição |
| ----- | ------------------ | ----------- | --------- |
| items | Array<SchoolClass> | Sim         |           |
| total | integer            | Sim         |           |

### StudentList

| Campo | Tipo           | Obrigatório | Descrição |
| ----- | -------------- | ----------- | --------- |
| items | Array<Student> | Sim         |           |
| total | integer        | Sim         |           |

### DeleteClassesRequest

| Campo | Tipo          | Obrigatório | Descrição |
| ----- | ------------- | ----------- | --------- |
| ids   | Array<string> | Sim         |           |

### Pins

| Campo    | Tipo          | Obrigatório | Descrição                   |
| -------- | ------------- | ----------- | --------------------------- |
| turmaIds | Array<string> | Sim         | Ordem em que foram fixadas. |

### PinRequest

| Campo  | Tipo    | Obrigatório | Descrição                              |
| ------ | ------- | ----------- | -------------------------------------- |
| fixada | boolean | Sim         | Estado desejado; operação idempotente. |

### Enrollment

| Campo | Tipo        | Obrigatório | Descrição             |
| ----- | ----------- | ----------- | --------------------- |
| aluno | Student     | Sim         | Ver DTO referenciado. |
| turma | SchoolClass | Sim         | Ver DTO referenciado. |

### LessonRequest

| Campo    | Tipo          | Obrigatório | Descrição                                                             |
| -------- | ------------- | ----------- | --------------------------------------------------------------------- |
| turmaId  | string        | Sim         | Turma existente e ativa.                                              |
| data     | string        | Sim         | Data civil local, sem horário; não pode ser futura em mutações.       |
| cursoId  | string        | Sim         | Curso do módulo selecionado; não precisa ser o curso padrão da turma. |
| moduloId | string        | Sim         | Módulo válido no curso informado.                                     |
| tipo     | string        | Sim         | ["regular","revisao","PR1","PR2","PR3"]                               |
| licoes   | Array<string> | Sim         |                                                                       |
| notas    | string        | Sim         | Até 600 caracteres antes de trim. Pode ser vazio.                     |

### Lesson

| Campo        | Tipo          | Obrigatório | Descrição                                                             |
| ------------ | ------------- | ----------- | --------------------------------------------------------------------- |
| id           | string        | Sim         | ID da aula.                                                           |
| turmaId      | string        | Sim         | Turma existente e ativa.                                              |
| data         | string        | Sim         | Data civil local, sem horário; não pode ser futura em mutações.       |
| cursoId      | string        | Sim         | Curso do módulo selecionado; não precisa ser o curso padrão da turma. |
| moduloId     | string        | Sim         | Módulo válido no curso informado.                                     |
| tipo         | string        | Sim         | ["regular","revisao","PR1","PR2","PR3"]                               |
| licoes       | Array<string> | Sim         |                                                                       |
| notas        | string        | Sim         | Até 600 caracteres antes de trim. Pode ser vazio.                     |
| atualizadoEm | string        | Sim         | Instante da última gravação; ISO 8601 em novos registros.             |
| professorId  | string        | Sim         | Professor autor da gravação.                                          |

### LessonList

| Campo | Tipo          | Obrigatório | Descrição |
| ----- | ------------- | ----------- | --------- |
| items | Array<Lesson> | Sim         |           |
| total | integer       | Sim         |           |

### AttendanceDay

Mapa de ID do aluno para presença/falta/null. null limpa a marca..

### AttendanceDays

object.

### AttendanceRequest

| Campo | Tipo           | Obrigatório | Descrição             |
| ----- | -------------- | ----------- | --------------------- |
| dias  | AttendanceDays | Sim         | Ver DTO referenciado. |

### Attendance

| Campo   | Tipo           | Obrigatório | Descrição             |
| ------- | -------------- | ----------- | --------------------- |
| turmaId | string         | Sim         | ID da turma.          |
| dias    | AttendanceDays | Sim         | Ver DTO referenciado. |

### AttendanceList

| Campo | Tipo              | Obrigatório | Descrição |
| ----- | ----------------- | ----------- | --------- |
| items | Array<Attendance> | Sim         |           |
| total | integer           | Sim         |           |

### StudentAssessment

| Campo      | Tipo   | Obrigatório | Descrição                                                                             |
| ---------- | ------ | ----------- | ------------------------------------------------------------------------------------- |
| id         | string | Sim         | ID do aluno.                                                                          |
| nome       | string | Sim         | Nome preservado no registro.                                                          |
| avaliacoes | object | Sim         | Chaves de critérios existentes. É permitido omitir critérios; não são exigidos todos. |

### AssessmentRequest

| Campo  | Tipo                     | Obrigatório | Descrição                                                    |
| ------ | ------------------------ | ----------- | ------------------------------------------------------------ |
| alunos | Array<StudentAssessment> | Sim         | Todos os alunos atualmente matriculados, exatamente uma vez. |

### Assessment

| Campo        | Tipo                     | Obrigatório | Descrição                                                 |
| ------------ | ------------------------ | ----------- | --------------------------------------------------------- |
| lessonId     | string                   | Sim         | ID da aula.                                               |
| alunos       | Array<StudentAssessment> | Sim         |                                                           |
| atualizadoEm | string                   | Sim         | Instante da última gravação; ISO 8601 em novos registros. |
| professorId  | string                   | Sim         | Professor autor da gravação.                              |

### LegacyAssessment

| Campo        | Tipo                     | Obrigatório | Descrição                                                 |
| ------------ | ------------------------ | ----------- | --------------------------------------------------------- |
| alunos       | Array<StudentAssessment> | Sim         |                                                           |
| atualizadoEm | string                   | Sim         | Instante da última gravação; ISO 8601 em novos registros. |
| professorId  | string                   | Sim         | Professor autor da gravação.                              |

### UnlinkedAssessment

| Campo      | Tipo             | Obrigatório | Descrição                                                       |
| ---------- | ---------------- | ----------- | --------------------------------------------------------------- |
| classId    | string           | Sim         | ID da turma.                                                    |
| date       | string           | Sim         | Data civil local, sem horário; não pode ser futura em mutações. |
| assessment | LegacyAssessment | Sim         | Ver DTO referenciado.                                           |

### Assessments

| Campo          | Tipo                      | Obrigatório | Descrição                                        |
| -------------- | ------------------------- | ----------- | ------------------------------------------------ |
| registros      | Array<Assessment>         | Sim         |                                                  |
| legadasSemAula | Array<UnlinkedAssessment> | Sim         |                                                  |
| avisoMigracao  | string                    | Sim         | Mensagem de falha de migração no mock, ou vazio. |

### ApiError

| Campo   | Tipo   | Obrigatório | Descrição                                                   |
| ------- | ------ | ----------- | ----------------------------------------------------------- |
| code    | string | Sim         | Código de erro.                                             |
| message | string | Sim         | Mensagem apresentável ao usuário.                           |
| details | object | Não         | Erros por campo, opcionais. O mock atual não emite details. |

## Endpoints

Todos os caminhos abaixo são relativos à base configurada. Campos de request/response seguem os DTOs acima. 403 é reservado à futura autorização; falhas 500/503 podem ser simuladas. Cada exemplo representa um recurso completo, não necessariamente todo o catálogo demonstrativo.

### POST /auth/session

Autenticar e iniciar sessão.

Perfil autorizado: **público, sem sessão**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: No mock, aceita somente professor/ipb123; trim e lowercase no usuário. Credenciais inválidas retornam 401. Persiste somente o DTO da sessão, nunca senha. Em API real, cookie HttpOnly é proposta pendente de validação.

Request body: **LoginRequest**.

```json
{
  "username": "professor",
  "password": "ipb123"
}
```

Response **200**: Sucesso.

DTO: **Session**.

```json
{
  "id": "professor-01",
  "nome": "Mariana Oliveira",
  "perfil": "professor"
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /auth/session

Validar/restaurar sessão.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Valida a sessão antes de ativar rotas protegidas. O modo api não confia na sessão local demonstrativa.

Request body: ausente.

Response **200**: Sucesso.

DTO: **Session**.

```json
{
  "id": "professor-01",
  "nome": "Mariana Oliveira",
  "perfil": "professor"
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### DELETE /auth/session

Encerrar sessão.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Executado somente após confirmação de saída do formulário. Falha preserva a sessão atual (salvo 401). Mock usa sessionStorage; falha no acesso é reportada.

Request body: ausente.

Response **204**: Sucesso; corpo ausente.

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /catalogo

Consultar cursos, módulos, professores e critérios.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Catálogo completo, somente leitura. Não há cadastro/edição desses recursos no frontend atual.

Request body: ausente.

Response **200**: Sucesso.

DTO: **Catalog**.

```json
{
  "cursos": [
    {
      "id": "formacao",
      "nome": "Formação integral",
      "modulos": [
        {
          "id": "identidade",
          "nome": "Módulo 1 · Identidade e valores",
          "licoes": [
            "Quem sou eu",
            "Minhas habilidades",
            "Valores no dia a dia",
            "Escolhas e consequências"
          ]
        }
      ]
    }
  ],
  "professores": [
    {
      "id": "professor-01",
      "nome": "Mariana Oliveira"
    }
  ],
  "criterios": [
    {
      "id": "conhecimento-conteudo",
      "nome": "Conhecimento do conteúdo"
    },
    {
      "id": "criatividade",
      "nome": "Criatividade"
    }
  ]
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /alunos

Consultar alunos para matrículas e histórico.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Retorna todos os alunos, inclusive os que perderam matrícula. Nomes atuais alimentam listas de alunos; avaliações preservam seus nomes históricos.

Request body: ausente.

Response **200**: Sucesso.

DTO: **StudentList**.

```json
{
  "items": [
    {
      "id": "aluno-01",
      "nome": "Ana Clara Santos"
    }
  ],
  "total": 1
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /turmas

Consultar turmas ativas e arquivadas.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Snapshot completo. O professor atual pode consultar todas as turmas. Busca, filtros, ordenação e paginação da tela são locais.

Request body: ausente.

Response **200**: Sucesso.

DTO: **ClassList**.

```json
{
  "items": [
    {
      "id": "turma-exemplo",
      "nome": "8º ano A",
      "cursoId": "formacao",
      "moduloId": "identidade",
      "professorId": "professor-01",
      "dias": [1, 3],
      "inicio": "08:00",
      "fim": "08:50",
      "ativa": true,
      "alunoIds": ["aluno-01"]
    }
  ],
  "total": 1
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### POST /turmas

Criar turma com matrículas.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Nome após trim obrigatório, até 60 caracteres, único sem distinguir maiúsculas em pt-BR. Curso/módulo e professor devem existir. Pelo menos um dia inteiro de 0 a 6. Início/fim no padrão de dois dígitos HH:mm, fim posterior ao início. Pelo menos um aluno existente. Dias e IDs de alunos são deduplicados. Não há validação de choque de horários, capacidade, faixa etária ou professor proprietário. ativa=false arquiva e preserva histórico. O ID é gerado no servidor.

Request body: **ClassRequest**.

```json
{
  "nome": "8º ano A",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "professorId": "professor-01",
  "dias": [1, 3],
  "inicio": "08:00",
  "fim": "08:50",
  "ativa": true,
  "alunoIds": ["aluno-01"]
}
```

Response **201**: Sucesso.

DTO: **SchoolClass**.

```json
{
  "id": "turma-exemplo",
  "nome": "8º ano A",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "professorId": "professor-01",
  "dias": [1, 3],
  "inicio": "08:00",
  "fim": "08:50",
  "ativa": true,
  "alunoIds": ["aluno-01"]
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### DELETE /turmas

Excluir turmas e registros associados em lote.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Lista não vazia; todas as turmas devem existir. Operação atômica: remove turmas, fixações, aulas, frequências e avaliações vinculadas/legadas das turmas. Preserva catálogo global de alunos. O corpo DELETE deve ser suportado pelo backend e proxies.

Request body: **DeleteClassesRequest**.

```json
{
  "ids": ["turma-exemplo"]
}
```

Response **204**: Sucesso; corpo ausente.

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PUT /turmas/{turmaId}

Substituir dados da turma, arquivar ou reativar.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.).

Query/filtros HTTP: nenhum.

Regras e validações: Nome após trim obrigatório, até 60 caracteres, único sem distinguir maiúsculas em pt-BR. Curso/módulo e professor devem existir. Pelo menos um dia inteiro de 0 a 6. Início/fim no padrão de dois dígitos HH:mm, fim posterior ao início. Pelo menos um aluno existente. Dias e IDs de alunos são deduplicados. Não há validação de choque de horários, capacidade, faixa etária ou professor proprietário. ativa=false arquiva e preserva histórico. Turma deve existir. Permite gestão de turma arquivada. Não remove marcas históricas de matrículas retiradas.

Request body: **ClassRequest**.

```json
{
  "nome": "8º ano A",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "professorId": "professor-01",
  "dias": [1, 3],
  "inicio": "08:00",
  "fim": "08:50",
  "ativa": true,
  "alunoIds": ["aluno-01"]
}
```

Response **200**: Sucesso.

DTO: **SchoolClass**.

```json
{
  "id": "turma-exemplo",
  "nome": "8º ano A",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "professorId": "professor-01",
  "dias": [1, 3],
  "inicio": "08:00",
  "fim": "08:50",
  "ativa": true,
  "alunoIds": ["aluno-01"]
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /turmas/fixadas

Consultar turmas fixadas.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: IDs existentes, na ordem de fixação. No mock, preferência compartilhada no navegador como antes. Escopo por usuário no backend depende de validação.

Request body: ausente.

Response **200**: Sucesso.

DTO: **Pins**.

```json
{
  "turmaIds": ["turma-exemplo"]
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PATCH /turmas/{turmaId}/fixacao

Fixar ou desafixar turma na tela inicial.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma deve existir, mesmo arquivada. Define estado desejado de forma idempotente. Retorna toda a ordem das fixações.

Request body: **PinRequest**.

```json
{
  "fixada": true
}
```

Response **200**: Sucesso.

DTO: **Pins**.

```json
{
  "turmaIds": ["turma-exemplo"]
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### POST /turmas/{turmaId}/alunos

Criar aluno e matricular na turma.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma ativa e existente. Nome após trim obrigatório com até 100 caracteres. Criação do aluno e matrícula são atômicas. Nomes repetidos são permitidos. Não há outros campos obrigatórios nem reutilização automática de aluno existente neste fluxo.

Request body: **StudentRequest**.

```json
{
  "nome": "Ana Clara Santos"
}
```

Response **201**: Sucesso.

DTO: **Enrollment**.

```json
{
  "aluno": {
    "id": "aluno-01",
    "nome": "Ana Clara Santos"
  },
  "turma": {
    "id": "turma-exemplo",
    "nome": "8º ano A",
    "cursoId": "formacao",
    "moduloId": "identidade",
    "professorId": "professor-01",
    "dias": [1, 3],
    "inicio": "08:00",
    "fim": "08:50",
    "ativa": true,
    "alunoIds": ["aluno-01"]
  }
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PATCH /turmas/{turmaId}/alunos/{alunoId}

Editar nome do aluno matriculado.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.); `alunoId` (string obrigatório; ID do aluno matriculado.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma ativa, aluno existente e matriculado nela. Nome após trim de 1 a 100 caracteres. Atualiza o cadastro global e listas das outras turmas. Não reescreve nomes em avaliações históricas já salvas.

Request body: **StudentRequest**.

```json
{
  "nome": "Ana Clara Santos"
}
```

Response **200**: Sucesso.

DTO: **Student**.

```json
{
  "id": "aluno-01",
  "nome": "Ana Clara Santos"
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### DELETE /turmas/{turmaId}/alunos/{alunoId}

Excluir somente a matrícula.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.); `alunoId` (string obrigatório; ID do aluno matriculado.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma ativa e matrícula existente. Não permite remover o último aluno. Preserva cadastro global, matrículas de outras turmas e todas as marcas históricas.

Request body: ausente.

Response **200**: Sucesso.

DTO: **SchoolClass**.

```json
{
  "id": "turma-exemplo",
  "nome": "8º ano A",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "professorId": "professor-01",
  "dias": [1, 3],
  "inicio": "08:00",
  "fim": "08:50",
  "ativa": true,
  "alunoIds": ["aluno-02"]
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /aulas

Consultar registros de aulas.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: `turmaId` (string opcional; Filtra por turma; ID sem registros retorna lista vazia.).

Regras e validações: Retorna snapshot de aulas das turmas acessíveis, inclusive arquivadas. turmaId é o único filtro HTTP; demais filtros são aplicados na tela.

Request body: ausente.

Response **200**: Sucesso.

DTO: **LessonList**.

```json
{
  "items": [
    {
      "id": "aula-exemplo",
      "turmaId": "turma-exemplo",
      "data": "2026-11-09",
      "cursoId": "formacao",
      "moduloId": "identidade",
      "tipo": "regular",
      "licoes": ["Quem sou eu"],
      "notas": "Atividade em grupo.",
      "professorId": "professor-01",
      "atualizadoEm": "2026-11-09T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### POST /aulas

Registrar aula.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Turma existente e ativa; na edição, turma anterior também ativa. Data civil válida até hoje. Curso/módulo existente, ao menos uma lição e todas pertencentes ao módulo selecionado. Tipo regular/revisao/PR1/PR2/PR3. notas permite vazio e tem limite de 600 antes de trim. Uma aula por turma/data. Professor original é preservado na edição; atualizadoEm é atualizado. Curso e módulo podem diferir do padrão da turma, conforme seletor existente. O ID e metadados são gerados pelo servidor.

Request body: **LessonRequest**.

```json
{
  "turmaId": "turma-exemplo",
  "data": "2026-11-09",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "tipo": "regular",
  "licoes": ["Quem sou eu"],
  "notas": "Atividade em grupo."
}
```

Response **201**: Sucesso.

DTO: **Lesson**.

```json
{
  "id": "aula-exemplo",
  "turmaId": "turma-exemplo",
  "data": "2026-11-09",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "tipo": "regular",
  "licoes": ["Quem sou eu"],
  "notas": "Atividade em grupo.",
  "professorId": "professor-01",
  "atualizadoEm": "2026-11-09T12:00:00.000Z"
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PUT /aulas/{aulaId}

Editar registro de aula.

Perfil autorizado: **professor**.

Parâmetros de rota: `aulaId` (string obrigatório; ID da aula.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma existente e ativa; na edição, turma anterior também ativa. Data civil válida até hoje. Curso/módulo existente, ao menos uma lição e todas pertencentes ao módulo selecionado. Tipo regular/revisao/PR1/PR2/PR3. notas permite vazio e tem limite de 600 antes de trim. Uma aula por turma/data. Professor original é preservado na edição; atualizadoEm é atualizado. Curso e módulo podem diferir do padrão da turma, conforme seletor existente. Aula deve existir. Avaliação existente permanece vinculada ao ID, mesmo ao editar data/turma.

Request body: **LessonRequest**.

```json
{
  "turmaId": "turma-exemplo",
  "data": "2026-11-09",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "tipo": "regular",
  "licoes": ["Quem sou eu"],
  "notas": "Atividade em grupo."
}
```

Response **200**: Sucesso.

DTO: **Lesson**.

```json
{
  "id": "aula-exemplo",
  "turmaId": "turma-exemplo",
  "data": "2026-11-09",
  "cursoId": "formacao",
  "moduloId": "identidade",
  "tipo": "regular",
  "licoes": ["Quem sou eu"],
  "notas": "Atividade em grupo.",
  "professorId": "professor-01",
  "atualizadoEm": "2026-11-09T12:00:00.000Z"
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /frequencias

Consultar chamadas e marcas históricas.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Um item por turma acessível, inclusive com dias={}. Preserva marcas de alunos removidos. Não exige que exista aula para a data da chamada.

Request body: ausente.

Response **200**: Sucesso.

DTO: **AttendanceList**.

```json
{
  "items": [
    {
      "turmaId": "turma-exemplo",
      "dias": {
        "2026-11-09": {
          "aluno-01": "presente"
        }
      }
    }
  ],
  "total": 1
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PATCH /turmas/{turmaId}/frequencias

Mesclar chamadas alteradas.

Perfil autorizado: **professor**.

Parâmetros de rota: `turmaId` (string obrigatório; ID da turma.).

Query/filtros HTTP: nenhum.

Regras e validações: Turma existente e ativa. Cada data deve ser válida até hoje. Novas marcas apenas de alunos atualmente matriculados; valores presente/falta/null. Mescla somente datas/alunos enviados; null limpa marca. {} é permitido. Preserva chamadas e alunos omitidos. Edição de chamada passada exige ativação explícita na interface, não um novo campo HTTP. Não valida dias de encontro nem existência de aula.

Request body: **AttendanceRequest**.

```json
{
  "dias": {
    "2026-11-09": {
      "aluno-01": "presente"
    }
  }
}
```

Response **200**: Sucesso.

DTO: **Attendance**.

```json
{
  "turmaId": "turma-exemplo",
  "dias": {
    "2026-11-09": {
      "aluno-01": "presente"
    }
  }
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### GET /avaliacoes

Consultar avaliações por aula e legados sem aula.

Perfil autorizado: **professor**.

Parâmetros de rota: nenhum.

Query/filtros HTTP: nenhum.

Regras e validações: Mock migra por turma/data quando há aula correspondente; se falhar, preserva originais e expõe avisoMigracao. Legados sem aula permanecem consultáveis separadamente, sem criar aula fictícia. Não há endpoint de edição direta desses legados.

Request body: ausente.

Response **200**: Sucesso.

DTO: **Assessments**.

```json
{
  "registros": [
    {
      "lessonId": "aula-exemplo",
      "alunos": [
        {
          "id": "aluno-01",
          "nome": "Ana Clara Santos",
          "avaliacoes": {
            "conhecimento-conteudo": "ok",
            "criatividade": null
          }
        }
      ],
      "atualizadoEm": "2026-11-09T12:00:00.000Z",
      "professorId": "professor-01"
    }
  ],
  "legadasSemAula": [],
  "avisoMigracao": ""
}
```

Erros: **401** Credenciais inválidas ou sessão ausente/expirada. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.

### PUT /aulas/{aulaId}/avaliacao

Salvar avaliação observacional da aula.

Perfil autorizado: **professor**.

Parâmetros de rota: `aulaId` (string obrigatório; ID da aula.).

Query/filtros HTTP: nenhum.

Regras e validações: Aula existente, turma ativa, data até hoje. Deve enviar exatamente todos os alunos atualmente matriculados, sem duplicatas. Chaves de critérios existentes; valores ok/nao-ok/null. Não exige todos os critérios preenchidos. Preserva avaliações de alunos removidos, atualiza professor para usuário atual e timestamp. Remove legado da mesma turma/data ao salvar.

Request body: **AssessmentRequest**.

```json
{
  "alunos": [
    {
      "id": "aluno-01",
      "nome": "Ana Clara Santos",
      "avaliacoes": {
        "conhecimento-conteudo": "ok",
        "criatividade": null
      }
    }
  ]
}
```

Response **200**: Sucesso.

DTO: **Assessment**.

```json
{
  "lessonId": "aula-exemplo",
  "alunos": [
    {
      "id": "aluno-01",
      "nome": "Ana Clara Santos",
      "avaliacoes": {
        "conhecimento-conteudo": "ok",
        "criatividade": null
      }
    }
  ],
  "atualizadoEm": "2026-11-09T12:00:00.000Z",
  "professorId": "professor-01"
}
```

Erros: **400** Estrutura JSON inválida. **401** Credenciais inválidas ou sessão ausente/expirada. **403** Reservado à autorização do backend; não é emitido no mock com o único perfil atual. **404** Recurso ou matrícula inexistente. **409** Conflito de unicidade ou turma arquivada. **422** Regra de validação do domínio não atendida. **500** Erro interno; simulável por configuração. **503** Serviço/armazenamento indisponível; simulável por configuração.
