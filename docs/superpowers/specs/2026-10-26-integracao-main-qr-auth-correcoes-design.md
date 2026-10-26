# Integracao com main: QR, autenticacao e correcoes — desenho

## Intencao

Integrar a branch de cadastro, login, listagem de correcoes e correcoes sem aluno com a `origin/main` que ja contem a correcao por QR Code, sem perder nenhum dos dois fluxos e deixando a branch pronta para uma nova revisao.

## Objetivos

- Preservar integralmente o fluxo QR do PR #15: contexto por codigo, criacao, detalhe, edicao e leitura por camera/manual.
- Acrescentar listagem, opcoes de formulario, questoes de versao, cadastro manual e associacao de aluno sem substituir os contratos QR.
- Manter `application-corrections` apontando para `CorrecaoView`, por ser a rota ja publicada na main.
- Disponibilizar o historico/manual em `application-corrections-list` e as pendencias em `application-unidentified-corrections`.
- Corrigir a serializacao de `ApiError` no teste de rota sem enfraquecer o tratamento de erros em producao.
- Garantir que `package.json` e `package-lock.json` instalem bcrypt a partir de um checkout limpo.
- Executar a suite, o build e a validacao com MySQL real, incluindo cadastro, login, logout e correcao via QR.

## Contratos combinados

### API QR preservada

- `GET /api/corrections/context?code=...`
- `POST /api/corrections`
- `GET /api/corrections/:id`
- `PUT /api/corrections/:id`

### API complementar

- `GET /api/corrections?applicationId=...&search=...`
- `POST /api/corrections/manual`
- `GET /api/corrections/applications/:applicationId/form-options`
- `GET /api/corrections/applications/:applicationId/pending`
- `GET /api/corrections/applications/:applicationId/students`
- `GET /api/corrections/versions/:versionId/questions`
- `PUT /api/corrections/:correctionId/student`

O corpo define qual fluxo de criacao sera usado pela URL, sem heuristica baseada em campos. O `POST /` continua QR e o novo `POST /manual` usa versao/aluno/respostas.

## Camadas

- O controller tera uma factory injetavel para os testes e expora metodos dos dois dominios.
- O service exportara os metodos QR e manuais. Ambos usarao somente o professor da sessao.
- O repository exportara as consultas dos dois fluxos, preservando transacoes e escopo de propriedade.
- O router declarara rotas estaticas antes de `/:id`, evitando captura indevida de `context`, `manual`, `applications` e `versions`.

## Interface

- `/aplicacoes/:id/correcoes` (`application-corrections`) permanece em `CorrecaoView` para scanner QR.
- `/aplicacoes/:id/correcoes/lista` (`application-corrections-list`) usa `CorrecoesView` para historico e cadastro manual.
- `/aplicacoes/:id/correcoes/sem-aluno` permanece em `CorrecoesSemAlunoView`.
- `CorrecaoView` recebe atalhos para historico e pendencias quando existe `applicationId` na rota.
- A tela de detalhes da aplicacao abre o scanner, mantendo o comportamento da main.

## Erros e testes

- Testes ESM devem obter `ApiError` pela mesma instancia CommonJS usada pela rota ou, preferencialmente, exercitar a validacao real do service.
- Nao sera alterado o `instanceof ApiError` de producao apenas para acomodar um double de teste.
- Testes de rota devem provar coexistencia e precedencia dos endpoints.
- MySQL deve estar disponivel para que `correctionsRoutes.mysql.test.js` nao seja pulado.

## Acesso inicial

O seed nao deve manter senha conhecida em texto. Se o professor do seed nao tiver credencial documentada, o README instruira o cadastro de um professor pela tela `/cadastro` antes do primeiro login.

## Fora do escopo

Esta entrega resolve integralmente a integracao tecnica. Conversas ou coordenacao
externa com outros colaboradores nao fazem parte do trabalho solicitado.
