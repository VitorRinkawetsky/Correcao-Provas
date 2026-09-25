# SGP Católica - Especificação técnica N2

**Versão:** 2.0  
**Data:** 25 de setembro de 2026  
**Status:** aprovada para implementação  
**Público:** equipe de desenvolvimento

## 1. Objetivo

Implementar a persistência e a API do SGP Católica para substituir
gradualmente os dados simulados do front-end. A aplicação é operada
exclusivamente por professores.

Esta versão substitui qualquer interpretação anterior de que o aluno acessaria
o sistema. Somente o professor possui conta e pode efetuar login. O aluno não
acessa a aplicação em nenhuma hipótese.

## 2. Atores e acesso

### 2.1 Professor

É o único perfil de acesso, o único que possui credenciais e o único que pode
efetuar login. Depois de autenticado, pode:

- gerenciar seu banco de questões objetivas;
- gerenciar turmas e registros de alunos;
- criar e editar provas;
- criar aplicações e gerar versões;
- acompanhar e confirmar correções;
- consultar notas, estatísticas e relatórios.

### 2.2 Aluno

Não é usuário nem perfil de acesso do sistema. É somente um registro acadêmico
utilizado para:

- compor uma turma;
- receber uma versão de prova;
- ser identificado por matrícula ou QR Code;
- receber correções e notas;
- aparecer em relatórios consultados pelo professor.

O aluno não possui senha, login, sessão, token, permissões ou tela própria.

## 3. Escopo funcional da N2

| Código | Requisito |
|---|---|
| N2-RF01 | Permitir login exclusivamente ao professor e manter suas credenciais. |
| N2-RF02 | Persistir alunos como registros acadêmicos sem acesso ao sistema. |
| N2-RF03 | Permitir ao professor cadastrar turmas e vincular alunos. |
| N2-RF04 | Permitir CRUD de questões objetivas com tags. |
| N2-RF05 | Exigir de duas a cinco alternativas e exatamente uma correta. |
| N2-RF06 | Permitir ao professor criar provas e definir ordem e pontuação. |
| N2-RF07 | Permitir criar aplicações de uma prova para uma turma. |
| N2-RF08 | Persistir versões, embaralhamento e QR Codes. |
| N2-RF09 | Persistir correções, respostas e notas. |
| N2-RF10 | Permitir ao professor consultar o desempenho dos alunos. |

## 4. Fora do escopo

- conta, autenticação, login ou portal do aluno;
- consulta de nota pelo próprio aluno;
- questões discursivas;
- envio de notificações aos alunos;
- Redis, cache e sincronização offline nesta primeira fase;
- geração definitiva de PDFs e leitura real por câmera nesta tarefa de banco.

## 5. Tecnologia

| Componente | Tecnologia |
|---|---|
| Banco relacional | MySQL 8.4 |
| Driver | `mysql2/promise` |
| Back-end | Node.js e Express 5 |
| Ambiente local | Docker Compose |
| Front-end | Vue.js 3 |

O PostgreSQL não será utilizado nesta implementação.

## 6. Modelo de acesso e identidade

### `professors`

Representa quem utiliza o sistema.

Campos principais:

- `id`;
- `full_name`;
- `email`, único;
- `password_hash`;
- `is_active`;
- datas de criação e atualização.

### `students`

Representa o aluno apenas como dado acadêmico.

Campos principais:

- `id`;
- `full_name`;
- `registration`, única;
- `email`, opcional e sem finalidade de login;
- `status`;
- datas de criação e atualização.

É proibido adicionar `password_hash`, refresh token, sessão ou papel de acesso
à tabela `students`.

## 7. Modelo relacional

| Tabela | Relacionamentos principais |
|---|---|
| `professors` | Mantém turmas, questões, provas e aplicações |
| `students` | Participa de turmas, atribuições e correções |
| `classes` | Pertence a um professor |
| `class_students` | Relaciona turmas e alunos |
| `questions` | Pertence a um professor |
| `alternatives` | Pertence a uma questão |
| `tags` | Classifica questões |
| `question_tags` | Relaciona questões e tags |
| `exams` | Pertence a um professor |
| `exam_questions` | Define questões, ordem e pontuação da prova |
| `applications` | Relaciona prova, turma e professor |
| `exam_versions` | Representa uma versão gerada da aplicação |
| `exam_version_questions` | Registra a ordem impressa das questões |
| `exam_version_alternatives` | Registra a ordem impressa das alternativas |
| `exam_assignments` | Atribui versão e QR Code a um aluno |
| `corrections` | Consolida a correção de uma prova |
| `correction_answers` | Registra respostas e pontuação por questão |

O schema executável e os seeds estão em `database/init.sql`.
A fonte versionável do DER está em `docs/der-sgp-n2.mmd`.

## 8. Regras obrigatórias

### Questões

- Somente questões objetivas.
- Entre duas e cinco alternativas.
- Exatamente uma alternativa correta.
- A criação ou edição deve ocorrer em transação.
- Não confirmar a transação se alternativas ou tags falharem.

O banco impede mais de uma alternativa correta. A camada de serviço deve
validar o mínimo de duas alternativas e a existência de exatamente uma
correta.

### Turmas e alunos

- Uma turma pertence a um professor.
- Uma matrícula identifica unicamente um aluno.
- Remover um aluno de uma turma remove a matrícula, não o registro acadêmico.
- Um professor só pode acessar suas próprias turmas e respectivos alunos.

### Provas e aplicações

- Uma prova pertence a um professor.
- A soma das pontuações deve ser calculada a partir de `exam_questions`.
- Uma aplicação associa prova e turma do mesmo professor.
- A geração de versões deve copiar todas as questões da prova.
- Embaralhamentos devem ser persistidos, não recalculados durante a correção.
- Códigos públicos e QR Codes devem ser únicos.

### Correções

- A correção deve apontar para a versão efetivamente recebida.
- Quando houver identificação automática, deve apontar para o aluno atribuído.
- Uma leitura não identificada pode guardar nome e matrícula informados para
  associação manual.
- Nota total e respostas devem ser gravadas na mesma transação.
- Somente o professor responsável pode confirmar ou alterar uma correção.

## 9. API REST proposta

Todas as rotas, exceto saúde e login, exigirão autenticação de professor. Não
existe um perfil genérico de acesso: toda identidade autenticada deve
corresponder a um registro ativo da tabela `professors`.

### Infraestrutura e autenticação

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica API e banco |
| POST | `/api/auth/login` | Autentica professor |
| GET | `/api/auth/me` | Retorna professor autenticado |
| POST | `/api/auth/logout` | Encerra a sessão |

Não deve existir rota de autenticação para alunos.
O endpoint `/api/auth/login` deve consultar exclusivamente `professors`. E-mail,
matrícula ou qualquer outro dado presente apenas em `students` nunca pode ser
aceito como credencial.

### Questões

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/questions` | Lista e filtra questões do professor |
| POST | `/api/questions` | Cria questão, alternativas e tags |
| GET | `/api/questions/:id` | Consulta uma questão |
| PUT | `/api/questions/:id` | Edita uma questão |
| DELETE | `/api/questions/:id` | Arquiva ou remove uma questão |

### Turmas e alunos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/classes` | Lista turmas do professor |
| POST | `/api/classes` | Cria turma |
| GET | `/api/classes/:id` | Consulta turma e alunos |
| PUT | `/api/classes/:id` | Edita turma |
| GET | `/api/classes/:id/students` | Lista alunos da turma |
| POST | `/api/classes/:id/students` | Cadastra ou vincula aluno |
| DELETE | `/api/classes/:id/students/:studentId` | Remove vínculo com a turma |
| GET | `/api/classes/:id/students/:studentId/grades` | Consulta notas para o professor |

### Provas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/exams` | Lista provas do professor |
| POST | `/api/exams` | Cria prova e questões |
| GET | `/api/exams/:id` | Consulta composição |
| PUT | `/api/exams/:id` | Edita prova |
| DELETE | `/api/exams/:id` | Arquiva prova sem histórico |

### Aplicações e correções

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/applications` | Lista aplicações do professor |
| POST | `/api/applications` | Cria aplicação |
| GET | `/api/applications/:id` | Consulta aplicação e progresso |
| POST | `/api/applications/:id/versions` | Gera versões |
| GET | `/api/applications/:id/versions` | Lista versões |
| POST | `/api/corrections` | Registra correção |
| PUT | `/api/corrections/:id` | Confirma ou ajusta correção |

## 10. Formato de resposta e erros

Resposta de sucesso:

```json
{
  "data": {},
  "meta": {}
}
```

Resposta de erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": []
  }
}
```

Status HTTP mínimos:

- `200`: consulta ou atualização;
- `201`: criação;
- `204`: remoção sem conteúdo;
- `400`: payload inválido;
- `401`: professor não autenticado;
- `403`: recurso pertence a outro professor;
- `404`: recurso inexistente;
- `409`: e-mail, matrícula ou código duplicado;
- `500`: erro interno;
- `503`: banco indisponível.

## 11. Arquitetura de implementação

```text
route
  -> authentication middleware
  -> controller
  -> service
  -> repository
  -> MySQL
```

- Rotas não contêm SQL nem regras de negócio.
- Controllers apenas traduzem HTTP.
- Services validam propriedade, consistência e transações.
- Repositories concentram consultas parametrizadas.
- O identificador do professor deve vir da sessão, nunca do corpo enviado pelo
  cliente.

## 12. Ordem recomendada

1. Autenticação do professor.
2. CRUD de questões.
3. CRUD de turmas e alunos.
4. CRUD de provas.
5. Aplicações e versões.
6. Correções e relatórios.
7. Remoção definitiva dos mocks.
8. Migrações, testes de integração e documentação da API.

## 13. Critérios de aceite

- MySQL sobe com `npm run db:up`.
- O script cria 17 tabelas e 2 views sem erro.
- Seeds incluem professor, alunos, turmas, questões, provas e correções.
- `GET /api/health` retorna `status: "ok"`.
- `students` não possui credenciais.
- Não existe autenticação ou portal de aluno.
- Somente um registro ativo de `professors` pode efetuar login.
- Todas as consultas de domínio respeitam o professor proprietário.
- Escritas compostas utilizam transação e rollback.
- Testes cobrem sucesso, validação, duplicidade, recurso inexistente e acesso
  indevido.

## 14. Ambiente local

```powershell
Copy-Item .env.example .env
npm install
npm run db:up
npm run build
npm start
```

Serviços:

- API e aplicação: `http://localhost:3000`;
- saúde: `http://localhost:3000/api/health`;
- MySQL: `localhost:3307`.

## 15. Estado atual

| Item | Estado |
|---|---|
| Schema e relacionamentos | Concluído |
| Seeds | Concluído |
| Docker Compose | Concluído |
| Pool MySQL | Concluído |
| Endpoint de saúde | Concluído |
| API CRUD | Pendente |
| Autenticação do professor | Pendente |
| Integração Vue com API | Pendente |
| Migrações versionadas | Pendente |
| Testes de integração | Pendente |
