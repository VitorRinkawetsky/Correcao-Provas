# ADR-002: Acesso exclusivo para professores

## Status

Aceita em 25 de setembro de 2026.

## Contexto

A concepção inicial considerava professores e alunos como usuários do sistema.
O escopo foi revisado: somente professores utilizarão a aplicação. Os alunos
continuam necessários para representar matrículas, identificação das provas,
correções e resultados, mas não terão conta, senha, sessão ou interface própria.

## Decisão

Separar as entidades de persistência:

- `professors`: contas dos professores e futuras credenciais de autenticação;
- `students`: registros acadêmicos gerenciados pelos professores.

Todas as rotas autenticadas serão destinadas ao professor. Consultas de notas,
turmas e correções serão feitas pelo professor, inclusive quando o recurso
consultado estiver relacionado a um aluno.

## Consequências

- A autenticação fica mais simples, pois existe apenas um ator do sistema.
- Alunos não armazenam senha, token, sessão ou permissões.
- A API não terá login, área pessoal ou endpoints de autoatendimento do aluno.
- As tabelas de matrículas, atribuições e correções continuam referenciando
  alunos.
- Requisitos e documentos anteriores que indiquem acesso do aluno devem ser
  considerados substituídos por esta decisão.
