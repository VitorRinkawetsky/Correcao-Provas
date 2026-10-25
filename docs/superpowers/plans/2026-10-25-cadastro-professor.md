# Cadastro de Professor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o cadastro público e exclusivo de professores com credencial bcrypt e erros HTTP previsíveis.

**Architecture:** O Express receberá o cadastro por uma rota pública e delegará validação, normalização, hash e persistência às camadas existentes. O Vue enviará somente nome, e-mail e senha por um client HTTP dedicado, mantendo a confirmação apenas no navegador.

**Tech Stack:** Vue 3, Vue Router, Express 5, MySQL2, bcrypt e Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-cadastro-professor-design.md`

## Global Constraints

- Somente professores podem criar conta.
- Senha forte: ao menos 8 caracteres e no máximo 72 bytes, com minúscula, maiúscula, número e caractere especial.
- Senha e `password_hash` nunca podem aparecer na resposta ou em logs.
- Não executar testes ou build localmente nesta tarefa, por solicitação do usuário.

## Review Focus

- E-mail com caixa e espaços diferentes deve colidir com a conta normalizada.
- Unicode não pode permitir que uma senha ultrapasse o limite de 72 bytes do bcrypt.
- Duas requisições simultâneas com o mesmo e-mail devem resultar em apenas uma conta.
- Campo `role` ou equivalente não pode abrir um fluxo de conta de aluno.
- Falha do banco não pode fazer o manipulador de erro registrar a senha recebida.

---

### Task 1: Contrato automatizado do cadastro

**Files:**
- Create: `src/services/authService.test.js`
- Create: `src/routes/authRoutes.test.js`
- Create: `src/client/views/RegisterView.test.js`

**Interfaces:**
- Consumes: contrato de erro de `ApiError` e schema `professors` existente.
- Produces: especificação executável de validação, persistência segura e formulário sem perfil.

- [x] Escrever testes de validação do service para nome, e-mail, força e tamanho em bytes da senha.
- [x] Escrever teste integrado da rota para `201`, hash bcrypt, resposta sem segredo, `409`, `400` e ausência de aluno.
- [x] Escrever teste do componente para ausência de perfil, validação e payload sem confirmação.
- [x] Não executar os testes nesta tarefa.

### Task 2: API de cadastro em camadas

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/repositories/professorsRepository.js`
- Create: `src/services/authService.js`
- Create: `src/controllers/authController.js`
- Create: `src/routes/authRoutes.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `pool.execute`, `ApiError` e `bcrypt.hash(password, 12)`.
- Produces: `register(payload) -> { id, fullName, email }` e `POST /api/auth/register`.

- [x] Adicionar bcrypt como dependência de produção.
- [x] Implementar busca e inserção de professor sem selecionar nem retornar `password_hash`.
- [x] Implementar validação/normalização e conversão de conflitos MySQL em `409`.
- [x] Implementar controller `201` e montar a rota pública em `/api/auth`.
- [x] Não executar os testes nesta tarefa.

### Task 3: Tela Vue de cadastro

**Files:**
- Create: `src/client/services/authApi.js`
- Create: `src/client/views/RegisterView.vue`
- Modify: `src/client/router/index.js`
- Modify: `src/client/styles/main.css`

**Interfaces:**
- Consumes: `POST /api/auth/register` com `{ fullName, email, password }`.
- Produces: rota pública `/cadastro`, validação acessível e estado de sucesso.

- [x] Implementar client HTTP sem confirmação ou perfil no payload.
- [x] Implementar formulário com feedback por campo e limpeza das senhas após sucesso.
- [x] Registrar a rota fora do `AppShell` e aplicar estilos responsivos com os tokens existentes.
- [x] Revisar o diff sem executar testes ou build.
