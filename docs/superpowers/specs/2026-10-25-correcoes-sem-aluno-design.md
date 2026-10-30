# Correcoes sem aluno — desenho

## Intencao

Permitir que um professor autenticado resolva manualmente correcoes cuja leitura nao identificou o aluno, sem criar identidade de acesso para estudantes e sem perder os dados originalmente reportados na prova.

## Objetivos

- Listar, por aplicacao, somente correcoes ainda sem `student_id` e sem `exam_assignment_id`, exibindo `reported_student_name` e `reported_student_registration`.
- Listar somente alunos ativos e com vinculo ativo na turma daquela aplicacao.
- Associar uma correcao dentro de uma transacao, validando propriedade do professor, turma, aluno e igualdade exata da matricula.
- Preencher `student_id` e, quando existir, o `exam_assignment_id` da mesma versao e do mesmo aluno.
- Preservar os campos `reported_student_*` como historico e retirar a correcao da lista de pendencias apos o sucesso.

## Nao objetivos e antiobjetivos

- Nao cadastrar aluno, conta, senha ou sessao de aluno.
- Nao criar `exam_assignment` durante a associacao.
- Nao aceitar `teacherId`, `classId`, `applicationId`, matricula ou dados do aluno no corpo da atualizacao; o corpo contem somente `studentId`.
- Nao apagar nem substituir nome ou matricula reportados.
- Uma associacao invalida jamais pode deixar alteracao parcial no banco.

## Restricoes

- Manter a arquitetura Express em `routes -> controller -> service -> repository -> MySQL`.
- Usar exclusivamente a identidade do professor proveniente da sessao autenticada.
- Reutilizar as tabelas atuais; nenhuma migracao e necessaria.
- Escrever testes antes do codigo de producao, mas nao executar testes, build, servidor ou banco nesta sessao por solicitacao do usuario.

## Abordagens consideradas

1. Atualizar diretamente a correcao com os dados enviados pela tela. E menor, mas permitiria forjar propriedade, turma ou matricula e nao oferece uma fronteira transacional segura.
2. Reaproveitar os endpoints genericos de turmas e fazer parte da validacao no cliente. Reduz codigo, mas separa consultas que precisam compartilhar o mesmo escopo de aplicacao e deixa a regra critica fora da transacao.
3. Criar um modulo dedicado de correcoes, com consultas sempre escopadas pela aplicacao e pelo professor, e uma associacao transacional com bloqueio da correcao. Esta e a abordagem escolhida por centralizar as invariantes no servidor e manter o historico.

## Desenho escolhido

### API

- `GET /api/corrections/applications/:applicationId/pending`: retorna as correcoes sem identificacao pertencentes ao professor autenticado.
- `GET /api/corrections/applications/:applicationId/students`: retorna alunos ativos com matricula e vinculo ativo na turma da aplicacao.
- `PUT /api/corrections/:correctionId/student` com `{ "studentId": number }`: associa o aluno.

A atualizacao abre uma transacao, busca a correcao com `FOR UPDATE` por meio de `exam_versions -> applications`, exige que a aplicacao pertença ao professor autenticado e que os dois vinculos ainda estejam vazios, bloqueia e valida o aluno na turma, compara a matricula selecionada com `reported_student_registration`, procura uma atribuicao da mesma versao e atualiza os identificadores. Conflitos de unicidade retornam `409`; entradas invalidas retornam `400`; recursos fora do escopo retornam `404` para nao revelar dados de outro professor.

### Interface

A rota protegida `/aplicacoes/:id/correcoes/sem-aluno` carrega as pendencias e os alunos da turma. Cada cartao mostra nome e matricula informados, oferece busca por nome ou matricula, selecao de aluno e botao de associacao com estado proprio de carregamento/erro. Em sucesso, o item e removido imediatamente da lista; em falha permanece intacto.

## Decisoes do implementador

- A validacao de matricula usa igualdade exata depois de remover espacos externos; nao corrige nem normaliza identificadores institucionais.
- Se existir `exam_assignment` para a versao/aluno, a correcao recebe tanto `student_id` quanto `exam_assignment_id`; caso contrario, recebe somente `student_id`.
- `status`, nota, observacoes, confirmacao, autoria e `reported_student_*` nao sao alterados pela associacao.
