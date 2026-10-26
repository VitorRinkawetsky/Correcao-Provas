# Correcoes sem aluno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tela e a API transacional para associar uma correcao sem identificacao a um aluno da turma da aplicacao.

**Architecture:** Um novo modulo Express segue `routes -> controller -> service -> repository -> MySQL`; a service concentra validacao e transacao, enquanto o repository mantem todas as consultas escopadas. A tela Vue consome tres operacoes pequenas e remove a pendencia localmente somente depois da resposta de sucesso.

**Tech Stack:** Node.js CommonJS, Express 5, mysql2, Vue 3, Vue Router, Vitest e Vue Test Utils.

**Spec:** `docs/superpowers/specs/2026-10-25-correcoes-sem-aluno-design.md`

## Global Constraints

- Nunca confiar em `teacherId` do cliente; usar somente a sessao autenticada.
- Nao criar conta, senha, login, aluno ou `exam_assignment` neste fluxo.
- Preservar `reported_student_name` e `reported_student_registration` depois da associacao.
- Associacao invalida deve executar rollback e nao alterar a correcao.
- Nesta sessao, escrever os testes primeiro, mas nao executar testes, build, servidor ou banco.

## Review Focus

- Repeticao concorrente da mesma associacao deve produzir no maximo um sucesso e nenhuma atualizacao parcial.
- Um aluno ativo globalmente, mas inativo na turma, deve ser rejeitado.
- Uma correcao de outra aplicacao/professor nao deve ser revelada nem alterada.
- Uma matricula com prefixo/sufixo ou diferenca de caixa deve ser rejeitada como nao identica.
- Um conflito com outra correcao da mesma versao/aluno deve retornar `409` sem apagar historico.

---

### Task 1: Contrato e transacao da API

**Files:**
- Create: `src/services/correctionsService.test.js`
- Create: `src/repositories/correctionsRepository.test.js`
- Create: `src/repositories/correctionsRepository.js`
- Create: `src/services/correctionsService.js`
- Create: `src/config/database.test.js`
- Modify: `src/config/database.js`

**Interfaces:**
- Produces: `listPending(teacherId, applicationId)`, `listStudents(teacherId, applicationId)`, `associateStudent(teacherId, correctionId, { studentId })`.
- Produces repository operations `listPending`, `listApplicationStudents`, `findPendingForUpdate`, `findStudentForUpdate`, `findAssignment`, `findAssociationConflict`, `updateAssociation`.

- [ ] Write service tests for ID/body validation, teacher ownership, class enrollment, exact registration, optional assignment, conflict handling, rollback, commit and history preservation.
- [ ] Write repository tests that pin teacher/application scoping, unresolved filtering, active enrollment, `FOR UPDATE`, and an update limited to identifier columns.
- [ ] Implement the repository queries.
- [ ] Implement dependency-injected service creation and the production singleton.
- [ ] Document deferred verification: `npm test -- src/services/correctionsService.test.js src/repositories/correctionsRepository.test.js` (not executed in this session).

### Task 2: Rotas HTTP protegidas

**Files:**
- Create: `src/controllers/correctionsController.js`
- Create: `src/routes/correctionsRoutes.js`
- Create: `src/routes/correctionsRoutes.test.js`
- Create: `src/routes/correctionsRoutes.mysql.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: service operations from Task 1 and `request.teacher.id` populated by authenticated middleware.
- Produces: the three JSON endpoints defined by the spec, with `data` and `meta` envelopes.

- [ ] Write route tests for status/envelope, invalid payload, foreign ownership and successful association without accepting a teacher ID.
- [ ] Implement controllers and route declarations with `teacherContext`.
- [ ] Mount `/api/corrections` after the global session guard.
- [ ] Document deferred verification: `npm test -- src/routes/correctionsRoutes.test.js` (not executed in this session).

### Task 3: Tela Vue e navegacao

**Files:**
- Create: `src/client/services/correctionsApi.js`
- Create: `src/client/views/CorrecoesSemAlunoView.vue`
- Create: `src/client/views/CorrecoesSemAlunoView.test.js`
- Create: `src/client/views/AplicacaoDetalhesView.test.js`
- Modify: `src/client/router/index.js`
- Modify: `src/client/views/AplicacaoDetalhesView.vue`

**Interfaces:**
- Consumes: endpoints from Task 2.
- Produces: protected route named `application-unidentified-corrections` and a corrections action on application details.

- [ ] Write component tests for reported fields, client-side student search, success removal, failure retention, per-row loading and absence of account/password controls.
- [ ] Implement the API adapter using `requestJson`.
- [ ] Implement the responsive view with loading, page error, empty state and per-item association error.
- [ ] Register the protected child route and connect the existing Correcoes button.
- [ ] Document deferred verification: `npm test -- src/client/views/CorrecoesSemAlunoView.test.js` (not executed in this session).

### Task 4: Revisao estatica final

**Files:**
- Review all files above and the complete diff without modifying unrelated work.

**Interfaces:**
- Consumes all earlier tasks.
- Produces a security and acceptance-criteria review report.

- [ ] Confirm statically that all SQL mutations occur after ownership and registration checks inside one transaction.
- [ ] Confirm no payload or response introduces password, login or account fields for students.
- [ ] Confirm UI removes only the successfully associated row and retains failed rows.
- [ ] Request a fresh whole-change code review limited to static inspection; do not run tests/build/server/database.
