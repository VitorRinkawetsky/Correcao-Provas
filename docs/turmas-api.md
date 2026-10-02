# API de turmas

Implementacao restrita a turmas e aos registros academicos vinculados a elas.
Usa o pool MySQL existente e as tabelas `classes`, `students`, `class_students`
e `professors`. A consulta de notas le a view `v_student_grades` e filtra a
aplicacao da turma. Nenhuma alteracao de schema ou nova dependencia e necessaria.

## Contexto do professor

A autenticacao ainda esta pendente no projeto. Este modulo aceita
`request.session.teacherId`, a ser preenchido por middleware de autenticacao.
Enquanto isso, em desenvolvimento, configure `DEFAULT_TEACHER_ID=1` no `.env`
para usar o professor dos seeds. O professor deve existir e estar ativo.
O identificador nunca e recebido do corpo ou dos headers do cliente.

Com `NODE_ENV=production`, o fallback de desenvolvimento e desabilitado e as
rotas retornam 401 ate existir uma sessao autenticada. Este modulo nao implementa login.

As credenciais do MySQL continuam sendo as variaveis `DB_*` existentes.
O proxy do Vite encaminha somente `/api/classes` para `http://127.0.0.1:3000`;
ao alterar a porta do backend, ajuste esse destino.

## Endpoints

| Metodo | Caminho | Resultado |
| --- | --- | --- |
| GET | `/api/classes` | Turmas ativas do professor e quantidade de alunos |
| GET | `/api/classes?status=archived` | Turmas arquivadas do professor |
| POST | `/api/classes` | Cria turma e gera convite unico; 201 |
| GET | `/api/classes/:id` | Turma com seus alunos |
| PUT | `/api/classes/:id` | Atualiza nome, disciplina, periodo e status opcional |
| DELETE | `/api/classes/:id` | Arquiva a turma preservando historico; 204 |
| POST | `/api/classes/:id/invite-code` | Gera e persiste um novo convite |
| GET | `/api/classes/:id/students` | Lista vinculos ativos da turma |
| POST | `/api/classes/:id/students` | Cadastra ou vincula aluno; 201 |
| DELETE | `/api/classes/:id/students/:studentId` | Remove somente o vinculo; 204 |
| GET | `/api/classes/:id/students/:studentId/grades` | Notas confirmadas do aluno nesta turma |

Criar e editar exigem `name` (ate 150 caracteres), `subject` (ate 120) e
`academicTerm` (ate 20). `term` tambem e aceito para o formulario existente.
O status aceita `active` e `archived`; quando omitido na edicao, e preservado.
Para reativar, envie os campos obrigatorios e `status: "active"` no PUT.

Para vincular aluno, envie `studentId`, `email` ou `registration` de um aluno
existente. Para cadastrar um aluno novo, envie `fullName` e `registration`,
com `email` opcional. A matricula e unica e o aluno nao possui credenciais.
E-mail desconhecido sem os dados obrigatorios retorna 400 com codigo
`STUDENT_DETAILS_REQUIRED`; o modal entao apresenta nome e matricula.
Repetir o vinculo nao duplica a matricula na turma. Alunos inativos nao podem
ser vinculados. Turmas arquivadas nao aceitam alteracoes de alunos ou convite.

## Respostas e integridade

Sucesso retorna `{ "data": ..., "meta": {} }`; listagens incluem `meta.total`.
Remocoes retornam 204 sem corpo. Erros retornam
`{ "error": { "code": "...", "message": "...", "details": [] } }`.
Validacao usa 400, ausencia de contexto usa 401, turma de outro professor usa
403, recurso inexistente usa 404, conflitos usam 409 e indisponibilidade de
conexao usa 503. Falhas inesperadas usam 500.

Escritas usam transacao com rollback. Turmas sao bloqueadas durante alteracoes
para serializar operacoes sobre seus vinculos. SQL usa parametros, e as
restricoes unicas do banco protegem matricula, e-mail e convite.

## Integracao das telas

`/turmas` consulta a listagem. `Nova turma` abre `/turmas/nova`; salvar cria no
banco e navega aos detalhes. Selecionar uma turma abre `/turmas/:id`; a acao
`Editar turma` abre `/turmas/:id/editar`, carrega os dados e salva via PUT.
Regenerar convite e adicionar/remover alunos tambem persistem no MySQL.
As demais telas continuam com seu comportamento anterior.

O cliente HTTP esta em `src/client/services/classApi.js`. Exemplos de todas as
requisicoes estao em `docs/turmas-api.http`. Substitua os IDs pelos retornados
na criacao antes de usar as operacoes de escrita.

Nao foram executados testes, build, servidor ou chamadas ao banco durante
esta implementacao, conforme solicitado.
