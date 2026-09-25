# ADR-001: MySQL como banco de dados relacional

## Status

Aceita em 25 de setembro de 2026.

## Contexto

O projeto precisa substituir os dados simulados do front-end por persistência
relacional na entrega N2. Havia dúvida entre PostgreSQL e MySQL. A especificação
do SGP define MySQL na arquitetura, o modelo da disciplina também estabelece
MySQL como parte da stack obrigatória e o projeto já possui a dependência
`mysql2`.

## Decisão

Usar MySQL 8.4 como banco relacional principal. O back-end Node.js acessará o
banco por meio de um pool de conexões de `mysql2/promise`. O ambiente local
será iniciado por Docker Compose e o arquivo `database/init.sql` criará o
schema e os dados iniciais.

Redis não faz parte desta primeira implementação do banco. Ele permanece como
evolução para filas, sincronização e cache quando o fluxo de correção offline
for implementado.

## Consequências

- A tecnologia fica alinhada com a especificação, a disciplina e as
  dependências atuais.
- O ambiente local passa a ser reproduzível sem instalação manual do MySQL.
- O script de inicialização é adequado para desenvolvimento, mas não substitui
  uma ferramenta de migração versionada em produção.
- Regras que dependem de várias tabelas devem ser protegidas também pela camada
  de serviço e por transações.
- Uma futura troca para PostgreSQL exigiria revisar enums, triggers, tipos,
  índices full-text e a biblioteca de conexão.
