# Tela de correcoes — desenho

## Intencao

Permitir que o professor autenticado consulte correcoes reais de uma aplicacao e registre manualmente as respostas de um aluno. O servidor e a unica autoridade sobre propriedade, gabarito, acertos e pontuacao; a gravacao do cabecalho e das respostas e atomica.

## Objetivos

- Listar somente correcoes identificadas de uma aplicacao pertencente ao professor autenticado, com busca por nome ou matricula, nota e status.
- Manter correcoes sem `student_id` e sem `exam_assignment_id` exclusivamente na tela de pendencias de identificacao ja existente.
- Oferecer versoes e alunos ativos da turma como opcoes para uma nova correcao.
- Expor as questoes e alternativas na ordem impressa da versao, sem revelar o gabarito ao cliente.
- Criar `corrections` e todos os seus `correction_answers` na mesma transacao MySQL.
- Calcular `is_correct`, `awarded_score` e `total_score` no servidor a partir do gabarito e dos pesos persistidos.

## Nao objetivos e antiobjetivos

- Nao consumir `mockData`, nao criar aluno, conta, senha ou login e nao editar o gabarito neste fluxo.
- Nao aceitar `teacherId`, `examAssignmentId`, `correctedBy`, nota, acerto ou pontuacao no corpo.
- Nao aceitar respostas parciais: o corpo deve conter exatamente uma entrada para cada questao da versao; `selectedAlternativeId: null` representa resposta em branco.
- Nao substituir uma correcao existente. A duplicidade de versao/aluno ou atribuicao retorna `409`.
- Nao misturar pendencias sem identificacao na listagem principal.

## Restricoes

- Manter `routes -> controller -> service -> repository -> MySQL`.
- Usar exclusivamente `request.teacher.id`, derivado da sessao.
- Escopar todas as consultas por professor e ocultar recursos alheios com `404`.
- Reutilizar o schema atual; nenhuma migracao e necessaria.
- Escrever testes antes da implementacao, mas nao executar testes, build, servidor ou MySQL nesta sessao, conforme solicitado pelo usuario.

## Contrato HTTP

- `GET /api/corrections?applicationId=:id&search=:texto`: correcoes identificadas, filtradas opcionalmente por nome ou matricula.
- `GET /api/corrections/applications/:applicationId/form-options`: versoes da aplicacao e alunos ativos com vinculo ativo na turma.
- `GET /api/corrections/versions/:versionId/questions`: questoes e alternativas da versao na ordem impressa, com o peso da questao e sem indicador de alternativa correta.
- `POST /api/corrections`: cria a correcao. Corpo:

```json
{
  "examVersionId": 12,
  "studentId": 31,
  "status": "confirmed",
  "notes": "Observacao opcional",
  "answers": [
    { "questionId": 4, "selectedAlternativeId": 15 },
    { "questionId": 7, "selectedAlternativeId": null }
  ]
}
```

`status` aceita `pending` ou `confirmed`. A autoria sempre e o professor da sessao e `confirmed_at` so e preenchido para uma correcao confirmada.

## Fluxo transacional

1. Validar tipos, campos permitidos, status, observacao e unicidade das questoes do corpo antes de abrir a transacao.
2. Bloquear a versao e validar que sua aplicacao pertence ao professor.
3. Bloquear e validar que o aluno e ativo e possui vinculo ativo na turma da aplicacao.
4. Carregar todas as questoes, alternativas, gabarito e pesos daquela versao.
5. Exigir correspondencia exata entre as questoes enviadas e as da versao; aceitar `null` como resposta em branco e rejeitar alternativa fora da questao/versao.
6. Buscar e bloquear a atribuicao opcional da mesma versao/aluno e rejeitar correcao duplicada.
7. Calcular valores em centavos para evitar deriva de ponto flutuante, inserir `corrections` e inserir todas as `correction_answers`.
8. Confirmar somente depois de todas as insercoes; qualquer falha causa rollback.

## Interface Vue

A rota protegida `/aplicacoes/:id/correcoes` apresenta busca, carregamento, erro e estado vazio para a lista real. Cada item mostra aluno, matricula, versao, nota, quantidade respondida e status. Um destaque separado leva a `/aplicacoes/:id/correcoes/sem-aluno`.

O formulario de nova correcao carrega opcoes reais, busca as questoes quando a versao muda, permite marcar uma alternativa ou deixar em branco e mostra estados independentes de carregamento e envio. Apos sucesso, o formulario e limpo e a lista e recarregada.

## Decisoes do implementador

- A busca e feita no servidor com `INSTR`, evitando que `%` e `_` do usuario virem curingas SQL.
- O registro e permitido mesmo quando nao existe `exam_assignment`; nesse caso, `student_id` identifica a correcao e `exam_assignment_id` permanece nulo.
- A nota exibida usa duas casas decimais; o valor persistido continua numerico no MySQL.
- Uma correcao identificada com status `pending` aparece na lista principal; "pendencia de identificacao" significa ausencia de aluno, nao o status academico da correcao.
