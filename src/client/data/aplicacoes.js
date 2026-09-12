export const aplicacoes = [
  { id: 1, prova: 'P1 - Banco de Dados', turma: 'ES - 4ª fase', status: 'Gerada', alunos: 32, corrigidas: 28 },
  { id: 2, prova: 'P2 - Estrutura de Dados', turma: 'CC - 2ª fase', status: 'Em correção', alunos: 30, corrigidas: 15 },
  { id: 3, prova: 'P1 - Redes', turma: 'SI - 6ª fase', status: 'Concluída', alunos: 25, corrigidas: 25 },
]

export function proximoId() {
  return Math.max(...aplicacoes.map((a) => a.id)) + 1
}
