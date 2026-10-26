# Cadastro exclusivo de professor

## Intenção

Permitir que um professor crie sua conta na aplicação sem oferecer qualquer
opção de cadastro ou autenticação para alunos. Alunos continuam sendo somente
registros acadêmicos vinculados a turmas.

## Escopo

- Criar uma tela Vue pública em `/cadastro`, sem seletor de perfil.
- Criar `POST /api/auth/register` nas camadas route, controller, service e
  repository.
- Validar nome, e-mail e senha; normalizar o e-mail; impedir duplicidade.
- Considerar forte uma senha com ao menos 8 caracteres e no máximo 72 bytes,
  além de uma letra minúscula, uma maiúscula, um número e um caractere especial.
- Gerar `password_hash` com bcrypt antes da persistência.
- Responder apenas com `id`, `fullName` e `email` do professor.
- Rejeitar tentativas de enviar um tipo de conta, inclusive aluno.

## Fora do escopo

- Login, sessão, logout ou proteção das rotas existentes.
- Cadastro independente de aluno.
- Alterações no fluxo de inclusão de alunos nas turmas.

## Abordagem

A implementação seguirá a arquitetura já usada no projeto: rota Express,
controller HTTP, service com regras de negócio e repository MySQL. A interface
usará um service HTTP próprio e os tokens visuais existentes. Foi descartado o
cadastro genérico por tipo de usuário porque conflita com a ADR-002; também foi
descartado colocar SQL ou bcrypt no controller porque quebraria a separação em
camadas adotada pelo repositório.

## Respostas esperadas

- `201`: professor criado, sem senha ou hash no corpo.
- `400`: nome, e-mail ou senha inválidos, confirmação divergente no cliente ou
  presença de campo de tipo de conta na API.
- `409`: e-mail já cadastrado, inclusive com diferença apenas de maiúsculas.

## Restrições

- A senha em texto puro só existe em memória durante a requisição e nunca é
  devolvida nem registrada.
- O índice único `uq_professors_email` continua sendo a garantia final contra
  condição de corrida.
- Os testes serão escritos como contrato, mas não executados nesta tarefa por
  solicitação do usuário.
