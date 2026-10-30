# Login de Professor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Autenticar professores ativos com sessão opaca revogável, proteger API e rotas Vue e encerrar a sessão no logout.

**Architecture:** O service autentica a credencial bcrypt e gera um token aleatório; o repository persiste somente o hash em `auth_sessions`. Um middleware resolve o cookie para um professor ativo e injeta a identidade usada pelos contextos existentes. O Vue mantém um store de sessão, restaura `/me` antes da navegação e aplica guards.

**Tech Stack:** Vue 3, Vue Router, Express 5, MySQL2, bcrypt, Node Crypto e Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-login-professor-design.md`

## Global Constraints

- Somente registros ativos de `professors` com `password_hash` podem autenticar.
- Nunca aceitar `teacher_id` ou `teacherId` do corpo como identidade.
- Cookie `HttpOnly`, `SameSite=Strict`, `Path=/` e `Secure` em produção.
- Não devolver nem registrar senha, hash de senha, token ou hash de sessão.
- Não executar testes, build, servidor ou banco nesta tarefa.

## Review Focus

- Cookie adulterado, ausente, expirado ou revogado deve retornar `401`.
- Professor desativado depois do login deve perder acesso imediatamente.
- E-mail de aluno nunca deve ser consultado como conta autenticável.
- Duas sessões não podem compartilhar token, e o banco nunca guarda o token em claro.
- Redirect pós-login não pode aceitar destino externo.

---

### Task 1: Contratos de autenticação e autorização

**Files:**
- Modify: `src/routes/authRoutes.test.js`
- Create: `src/middlewares/teacherContext.test.js`
- Modify: `src/middlewares/classTeacherContext.test.js`
- Create: `src/client/data/authStore.test.js`
- Create: `src/client/router/authGuard.test.js`
- Create: `src/client/views/LoginView.test.js`

**Interfaces:**
- Consumes: envelope de erro `ApiError`, bcrypt, schema `professors` e formulário Vue.
- Produces: contratos executáveis para login, `/me`, logout, middleware, guard e UI.

- [ ] Cobrir login válido, cookie seguro, `/me`, credencial inválida, inativo, aluno e `teacher_id`.
- [ ] Cobrir revogação no logout e bloqueio de API sem sessão.
- [ ] Cobrir restauração/login/logout do store e redirecionamentos do guard.
- [ ] Cobrir loading/erro e payload mínimo da tela de login.
- [ ] Não executar os testes nesta tarefa.

### Task 2: Sessão opaca e proteção da API

**Files:**
- Modify: `database/init.sql`
- Modify: `.env.example`
- Create: `src/config/auth.js`
- Create: `src/http/authCookie.js`
- Create: `src/repositories/authRepository.js`
- Modify: `src/services/authService.js`
- Modify: `src/controllers/authController.js`
- Modify: `src/routes/authRoutes.js`
- Create: `src/middlewares/requireTeacherSession.js`
- Modify: `src/middlewares/teacherContext.js`
- Modify: `src/middlewares/classTeacherContext.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `{ email, password }`, cookie `sgp_session` e `auth_sessions`.
- Produces: `login`, `authenticateSession`, `logout` e identidade em `request.authenticatedTeacherId`.

- [ ] Adicionar tabela de sessões com token hash único, expiração e FK para professor.
- [ ] Implementar consultas parametrizadas de credencial e sessão.
- [ ] Implementar bcrypt, token aleatório, SHA-256, expiração e erros uniformes.
- [ ] Implementar cookie, endpoints e middleware global antes das rotas protegidas.
- [ ] Remover fallback de identidade por variável de ambiente.
- [ ] Não executar os testes nesta tarefa.

### Task 3: Login, estado de sessão e guards no Vue

**Files:**
- Modify: `src/client/services/apiClient.js`
- Modify: `src/client/services/authApi.js`
- Create: `src/client/data/authStore.js`
- Create: `src/client/router/authGuard.js`
- Create: `src/client/views/LoginView.vue`
- Modify: `src/client/views/RegisterView.vue`
- Modify: `src/client/router/index.js`
- Modify: `src/client/components/layout/AppShell.vue`
- Modify: `src/client/styles/main.css`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` e cookie same-origin.
- Produces: `/login`, store reativo, rotas privadas, redirect interno e logout no cabeçalho.

- [ ] Implementar funções HTTP e store com restauração deduplicada da sessão.
- [ ] Implementar guard para rotas privadas e públicas de convidado.
- [ ] Implementar tela de login com loading, erros e redirect interno seguro.
- [ ] Exibir professor e logout no shell; apontar cadastro para login.
- [ ] Revisar estaticamente o diff sem executar testes ou build.
