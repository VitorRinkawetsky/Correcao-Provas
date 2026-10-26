# Tela de correcoes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar listagem real e cadastro transacional de correcoes com pontuacao derivada do gabarito.

**Architecture:** Estender o modulo de correcoes existente. Routes e controller apenas transportam o professor autenticado; service valida e coordena a transacao; repository concentra SQL escopado; a tela Vue consome apenas a API real.

**Tech Stack:** Node.js CommonJS, Express 5, mysql2, Vue 3, Vue Router, Vitest e Vue Test Utils.

**Spec:** `docs/superpowers/specs/2026-10-25-tela-correcoes-design.md`

## Global Constraints

- Nunca confiar em propriedade, atribuicao, acerto ou nota enviados pelo cliente.
- Criar cabecalho e respostas na mesma transacao, com rollback integral em falha.
- Separar registros sem aluno da lista principal.
- Escrever os testes primeiro, mas nao executar testes, build, servidor ou banco nesta sessao.
- Preservar todas as alteracoes preexistentes da arvore de trabalho.

## Review Focus

- Alternativa valida globalmente, mas fora da questao/versao, deve ser rejeitada.
- Respostas ausentes, extras ou repetidas devem ser rejeitadas antes de gravar.
- Falha depois da insercao do cabecalho deve desfazer o cabecalho e todas as respostas.
- Professor alheio nao deve listar nem criar correcoes para a aplicacao.
- Concorrencia/duplicidade deve resultar em `409`, nunca duas correcoes.

---

### Task 1: Fixar o contrato em testes

**Files:**
- Modify: `src/services/correctionsService.test.js`
- Modify: `src/repositories/correctionsRepository.test.js`
- Modify: `src/routes/correctionsRoutes.test.js`
- Create: `src/client/views/CorrecoesView.test.js`
- Modify: `src/client/views/AplicacaoDetalhesView.test.js`

**Interfaces:**
- Produces expected service methods `listCorrections`, `getFormOptions`, `getVersionQuestions`, `createCorrection`.
- Produces expected HTTP and Vue contracts from the spec.

- [ ] Add service tests for strict payload validation, ownership, complete answer set, blank answers, scoring, duplicate conflict and transactional failure.
- [ ] Add repository tests that pin identified filtering, ownership, printed order, answer-key joins, row locks and inserts on the passed transaction.
- [ ] Add route tests for list, form queries and `201` creation with session identity.
- [ ] Add Vue tests for real loading/search/error/list/form/status/score behavior and separate unidentified navigation.
- [ ] Do not execute the tests in this session.

### Task 2: Implementar API e transacao

**Files:**
- Modify: `src/repositories/correctionsRepository.js`
- Modify: `src/services/correctionsService.js`
- Modify: `src/controllers/correctionsController.js`
- Modify: `src/routes/correctionsRoutes.js`
- Modify: `src/routes/correctionsRoutes.mysql.test.js`

**Interfaces:**
- Consumes the contracts fixed by Task 1.
- Produces the four endpoints described in the spec.

- [ ] Implement scoped list, form options and question queries.
- [ ] Implement strict creation payload and answer-key based calculation.
- [ ] Insert correction and answers through the same transaction object.
- [ ] Translate duplicate-key races to `409` and all invalid inputs to `400` without partial writes.
- [ ] Extend the deferred MySQL integration test to cover persistence, ownership and rollback.

### Task 3: Implementar tela principal

**Files:**
- Modify: `src/client/services/correctionsApi.js`
- Create: `src/client/views/CorrecoesView.vue`
- Modify: `src/client/router/index.js`
- Modify: `src/client/views/AplicacaoDetalhesView.vue`
- Modify: `src/client/data/mockData.js`

**Interfaces:**
- Consumes the API from Task 2.
- Produces protected route `application-corrections` and keeps `application-unidentified-corrections` separate.

- [ ] Add API adapter operations without importing mock data.
- [ ] Implement list search, loading, error, empty state, note, score and status.
- [ ] Implement form options, version-question loading, blank answers and submit state.
- [ ] Navigate the application action to the main corrections screen and expose the separate unidentified link.
- [ ] Add the `confirmed` presentation label/tone without moving correction data into mocks.

### Task 4: Revisao estatica final

**Files:**
- Review all files above and the complete scoped diff.

**Interfaces:**
- Consumes all earlier tasks.
- Produces a static security and acceptance report.

- [ ] Inspect syntax, module exports/imports and SQL placeholders without executing code.
- [ ] Confirm every write uses the transaction handle and no response reveals the answer key.
- [ ] Request a fresh static code review focused on the Review Focus section.
- [ ] Report explicitly that runtime verification was not performed at the user's request.
