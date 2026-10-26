# Login exclusivo de professor

## Intenção

Autenticar exclusivamente professores ativos, manter sua identidade em uma
sessão revogável e impedir o acesso às telas e APIs internas sem autenticação.

## Escopo

- Criar `POST /api/auth/login`, `GET /api/auth/me` e
  `POST /api/auth/logout` nas camadas existentes.
- Consultar credenciais somente em `professors` e comparar `password_hash`
  com bcrypt.
- Persistir sessões opacas no MySQL; o cookie contém um token aleatório e o
  banco armazena somente seu hash SHA-256.
- Usar cookie `HttpOnly`, `SameSite=Strict`, `Path=/`, expiração de 8 horas e
  `Secure` em produção.
- Proteger todas as APIs, exceto saúde, cadastro, login e logout; `/me` exige
  sessão válida.
- Remover os fallbacks de professor configurado no ambiente e aceitar a
  identidade somente do middleware de sessão.
- Criar tela Vue de login, restauração da sessão, guards de rota, estados de
  carregamento/erro e ação de logout no cabeçalho.

## Fora do escopo

- Recuperação ou troca de senha.
- Autenticação de dois fatores e confirmação de e-mail.
- Sessão ou rota de autenticação para alunos.
- Sessão deslizante ou painel de dispositivos conectados.

## Abordagens consideradas

- Sessão opaca no MySQL: escolhida porque permite revogação imediata no
  logout, não expõe dados do professor no cookie e usa a persistência atual.
- JWT em cookie: descartado porque o logout não revogaria o token sem uma
  lista de bloqueio, recriando uma store de sessão.
- `express-session` em memória: descartado porque perde sessões ao reiniciar e
  não é adequado para produção ou múltiplas instâncias.

## Contratos

- Login válido: `200`, cookie de sessão e professor público no corpo.
- Credencial inexistente, senha incorreta, professor inativo ou sem hash:
  `401 INVALID_CREDENTIALS`, sem revelar qual condição falhou.
- `GET /me`: `200` com `id`, `fullName` e `email`; sessão ausente, expirada,
  revogada ou professor inativo retorna `401`.
- Logout: `204`, remove a sessão do MySQL e expira o cookie.
- `teacher_id` ou `teacherId` no corpo do login retorna `400`; nenhuma camada
  deriva identidade de corpo, query string ou cabeçalho fornecido pelo cliente.

## Restrições

- Senha, `password_hash`, token e hash de sessão nunca são devolvidos nem
  registrados.
- Os testes serão escritos, mas não executados nesta tarefa, mantendo a
  restrição solicitada na entrega anterior.
