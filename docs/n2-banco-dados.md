# N2 - Análise de implementação do banco de dados

## Decisão técnica

A tecnologia correta para este projeto é **MySQL**, e não PostgreSQL. A
especificação apresenta MySQL na arquitetura, o modelo da disciplina o inclui
na stack obrigatória e o repositório já utiliza `mysql2`.

A decisão está registrada em
[ADR-001](adr/ADR-001-banco-de-dados-mysql.md).

## Situação encontrada

Antes desta etapa, a aplicação possuía:

- telas Vue alimentadas por `mockData.js` e `aplicacoes.js`;
- Express usado somente para entregar o build estático;
- `mysql2` instalado, mas sem configuração de conexão;
- arquivo `src/config/database.js` vazio;
- ausência de schema, tabelas, seeds, repositórios e endpoints REST.

## Base implementada

Foram preparados:

- MySQL 8.4 executado por Docker Compose;
- script idempotente de recriação em `database/init.sql`;
- dados iniciais coerentes com os mocks;
- pool de conexões `mysql2/promise`;
- validação da conexão antes de iniciar o servidor;
- endpoint `GET /api/health`;
- chaves estrangeiras, índices, checks e triggers;
- views de progresso de aplicações e notas dos estudantes.
- separação entre professores autenticáveis e alunos sem acesso ao sistema.

O script cobre as seguintes entidades:

| Entidade | Responsabilidade |
|---|---|
| `professors` | Professores que operam e futuramente autenticam no sistema |
| `students` | Registros acadêmicos dos alunos, sem credenciais de acesso |
| `classes` | Turmas mantidas por um professor |
| `class_students` | Matrículas dos estudantes nas turmas |
| `questions` | Enunciados das questões objetivas |
| `alternatives` | Alternativas e indicação da resposta correta |
| `tags` / `question_tags` | Classificação e pesquisa das questões |
| `exams` / `exam_questions` | Provas, ordem e pontuação das questões |
| `applications` | Aplicação de uma prova para uma turma |
| `exam_versions` | Versões geradas e configuração de embaralhamento |
| `exam_version_questions` | Ordem impressa das questões por versão |
| `exam_version_alternatives` | Ordem impressa das alternativas por versão |
| `exam_assignments` | Versão e QR Code atribuídos a cada estudante |
| `corrections` | Resultado consolidado de uma correção |
| `correction_answers` | Resposta e pontuação de cada questão corrigida |

## Como executar localmente

1. Crie o arquivo de ambiente:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Inicie o MySQL:

   ```bash
   npm run db:up
   ```

3. Confira o estado do container:

   ```bash
   docker compose ps
   ```

4. Gere o front-end e inicie o Express:

   ```bash
   npm run build
   npm start
   ```

5. Verifique a conexão:

   ```text
   http://localhost:3000/api/health
   ```

Resposta esperada:

```json
{
  "status": "ok",
  "database": "correcao_provas",
  "checkedAt": "..."
}
```

O script em `database/init.sql` também pode ser executado diretamente em um
MySQL 8.4:

```bash
mysql -u root -p < database/init.sql
```

### Reinicialização completa

O script do diretório `docker-entrypoint-initdb.d` roda apenas quando o volume
é criado. Para apagar o banco local e carregar novamente todos os seeds:

```bash
docker compose down -v
npm run db:up
```

> Esse comando remove todos os dados do volume local.

## Regras de negócio consideradas

- Uma questão objetiva aceita posições de alternativa entre 1 e 5.
- O banco impede mais de uma alternativa correta por questão.
- O serviço deverá validar, dentro de uma transação, que a questão possui entre
  duas e cinco alternativas e exatamente uma correta antes do commit.
- E-mails, matrículas, códigos de convite, códigos públicos e QR Codes são
  únicos.
- Exclusões em entidades históricas usam `RESTRICT`; tabelas de composição
  usam `CASCADE`.
- A correção aceita identificação automática ou dados informados manualmente.
- Valores monetários não são usados; notas são armazenadas em
  `DECIMAL(6, 2)`, evitando imprecisão de ponto flutuante.

## Próximas implementações necessárias

### 1. API em camadas

Criar a estrutura:

```text
src/
├── routes/
├── controllers/
├── services/
├── repositories/
├── models/
└── middlewares/
```

Responsabilidades:

- **rota:** declarar método, URL e middlewares;
- **controller:** receber e responder HTTP;
- **service:** aplicar regras de negócio e transações;
- **repository:** executar SQL e mapear registros;
- **model:** representar e validar os dados do domínio.

### 2. Endpoints prioritários

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/questions` | Listar e filtrar questões |
| POST | `/api/questions` | Criar questão, alternativas e tags |
| PUT | `/api/questions/:id` | Editar uma questão |
| DELETE | `/api/questions/:id` | Arquivar ou excluir questão |
| GET/POST | `/api/classes` | Listar e criar turmas |
| GET/PUT | `/api/classes/:id` | Consultar e editar turma |
| POST | `/api/classes/:id/students` | Matricular estudante |
| GET/POST | `/api/exams` | Listar e criar provas |
| GET/PUT | `/api/exams/:id` | Consultar e editar prova |
| GET/POST | `/api/applications` | Listar e criar aplicações |
| POST | `/api/applications/:id/versions` | Gerar versões da prova |
| POST | `/api/corrections` | Registrar uma correção |
| GET | `/api/classes/:classId/students/:studentId/grades` | Professor consulta o histórico de um aluno |

### 3. Substituição dos mocks

Criar um cliente HTTP no front-end e migrar uma funcionalidade por vez:

1. banco de questões;
2. turmas e matrículas;
3. provas;
4. aplicações e versões;
5. correções e relatórios.

Durante essa migração, `mockData.js` e `aplicacoes.js` não devem continuar
como duas fontes concorrentes de verdade.

### 4. Autenticação e segurança

- Adicionar hash de senha do professor com bcrypt ou Argon2.
- Implementar sessão ou JWT exclusivamente para professores.
- Autorizar cada consulta pelo professor proprietário dos dados.
- Validar payloads antes de chegar aos repositórios.
- Nunca retornar `password_hash` na API.

O professor inicial possui `password_hash = NULL` porque o fluxo de login
ainda não existe. Antes de habilitar autenticação, a coluna deverá ser
preenchida e migrada para `NOT NULL`. A tabela `students` não possui senha,
sessão, token ou qualquer outra credencial.

### 5. Migrações e testes

O `init.sql` é indicado para banco local descartável. Antes de produção:

- adotar uma ferramenta de migração;
- versionar cada mudança incremental;
- adicionar testes de integração em um banco isolado;
- testar rollback das transações de questão, prova e correção;
- criar uma rotina de backup e restauração.

## Limite desta entrega

O banco, a carga inicial e a conexão estão prontos. O endpoint de saúde comprova
a conectividade. Os CRUDs e a troca dos mocks pela API ainda precisam ser
implementados nas próximas tarefas da N2.
