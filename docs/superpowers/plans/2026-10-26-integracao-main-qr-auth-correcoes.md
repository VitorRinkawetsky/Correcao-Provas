# Integracao main, QR, autenticacao e correcoes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver o merge da `origin/main`, preservar o fluxo QR e manter as funcionalidades de autenticacao, correcoes manuais e correcoes sem aluno com suite/build/MySQL validados.

**Architecture:** Combinar os exports das camadas de correcoes e separar explicitamente os dois comandos de criacao por URL. Preservar a rota e a tela QR da main; adicionar rota irmã para lista/manual. Corrigir falhas de teste na fronteira correta e validar em instalacao limpa e banco real.

**Tech Stack:** Node.js CommonJS, Express 5, mysql2, bcrypt 6, Vue 3, Vue Router, Vitest, Docker Compose e MySQL 8.

**Spec:** `docs/superpowers/specs/2026-10-26-integracao-main-qr-auth-correcoes-design.md`

## Global Constraints

- Nunca remover ou renomear os quatro endpoints QR publicados na main.
- Nunca confiar em `teacherId`, nota ou acerto enviados pelo cliente.
- Manter criacao de cabecalho e respostas atomica nos dois fluxos.
- Rotas estaticas devem preceder `/:id`.
- Usar `apply_patch` nas resolucoes manuais e preservar alteracoes de ambos os pais.
- Executar `npm ci`, `npm test`, `npm run build` e testes MySQL reais antes da conclusao.

## Review Focus

- `POST /api/corrections` deve continuar aceitando payload QR, enquanto `/manual` aceita somente o contrato manual.
- `GET /context` nao pode ser capturado por `GET /:id`.
- A tela `application-corrections` deve continuar oferecendo camera e entrada manual de QR.
- Uma falha em respostas deve reverter o cabecalho no MySQL.
- A suite deve carregar uma unica classe `ApiError` no teste que valida status 400.

---

### Task 1: Combinar contratos HTTP com testes

**Files:**
- Modify: `src/routes/correctionsRoutes.test.js`
- Modify: `src/routes/correctionsRoutes.js`
- Modify: `src/controllers/correctionsController.js`

**Interfaces:**
- Preserves: `getContext`, `correct`, `getCorrection`, `update`.
- Preserves/adds: `listCorrections`, `getFormOptions`, `getVersionQuestions`, `createCorrection`, `listPending`, `listStudents`, `associateStudent`.

- [ ] Resolver primeiro o teste para importar a mesma classe CommonJS `ApiError` e confirmar a falha atual.
- [ ] Adicionar teste RED provando os endpoints QR e manuais na mesma factory de router.
- [ ] Combinar controller e router, declarando estaticas antes de `/:id`.
- [ ] Rodar `npm test -- src/routes/correctionsRoutes.test.js` ate ficar verde.

### Task 2: Combinar service e repository

**Files:**
- Modify: `src/services/correctionsService.js`
- Modify: `src/repositories/correctionsRepository.js`
- Modify: `src/services/correctionsService.test.js`
- Modify: `src/repositories/correctionsRepository.test.js`

**Interfaces:**
- Consumes all controller methods from Task 1.
- Produces one CommonJS module per layer containing both fluxos.

- [ ] Adicionar/ajustar testes RED de contexto QR, criacao QR e exports combinados.
- [ ] Combinar os metodos sem duplicar helpers transacionais nem alterar contratos existentes.
- [ ] Rodar testes focados de service/repository.

### Task 3: Resolver navegacao e telas

**Files:**
- Modify: `src/client/router/index.js`
- Modify: `src/client/views/AplicacaoDetalhesView.vue`
- Modify: `src/client/views/AplicacaoDetalhesView.test.js`
- Modify: `src/client/views/CorrecaoView.vue`
- Modify: `src/client/views/CorrecoesView.vue`

**Interfaces:**
- Produces: `application-corrections` (QR), `correction-details`, `application-corrections-list`, `application-unidentified-corrections`.

- [ ] Escrever teste RED da rota/navegacao preservando QR e expondo lista separada.
- [ ] Resolver imports e rotas sem nomes duplicados.
- [ ] Adicionar atalhos entre scanner, historico e pendencias.
- [ ] Rodar testes Vue focados.

### Task 4: Dependencias, seed e documentacao

**Files:**
- Verify/Modify: `package.json`
- Verify/Modify: `package-lock.json`
- Modify: `README.md`

**Interfaces:**
- Produces reproducible dependency install and documented first access.

- [ ] Executar `npm ci` e confirmar instalacao de bcrypt 6 pelo lockfile.
- [ ] Inspecionar o seed e testar login; se nao houver senha conhecida segura, documentar cadastro inicial.
- [ ] Registrar no README as rotas QR, lista e pendencias.

### Task 5: Validacao completa e merge

**Files:**
- Modify tests only if a reproduced failure requires a test-first fix.

**Interfaces:**
- Produces merge commit integrating `origin/main` into the feature branch.

- [ ] Subir MySQL com Docker Compose e confirmar readiness.
- [ ] Executar `npm test` e confirmar zero falhas e zero suites puladas relevantes.
- [ ] Executar `npm run build`.
- [ ] Validar por HTTP cadastro, login, `/me`, aplicacao, contexto QR, criacao QR e logout no MySQL real.
- [ ] Confirmar `correctionsRoutes.mysql.test.js` executado, nao pulado.
- [ ] Fazer revisao independente, corrigir achados importantes e concluir o merge commit.
