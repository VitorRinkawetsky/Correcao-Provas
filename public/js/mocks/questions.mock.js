export const questions = [
    {
        id: 1,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual característica define corretamente uma chave primária em um banco de dados relacional?',
        tags: ['Banco de Dados', 'Modelagem'],
        alternatives: [
            { id: 1, text: 'Pode conter valores duplicados, desde que sejam ordenados.' },
            { id: 2, text: 'Identifica unicamente cada registro e não admite valor nulo.' },
            { id: 3, text: 'É usada apenas para armazenar dados temporários.' },
            { id: 4, text: 'Precisa ser formada por todas as colunas da tabela.' }
        ],
        correctAlternativeId: 2
    },
    {
        id: 2,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Em SQL, qual cláusula é usada para filtrar grupos depois de uma operação de agregação?',
        tags: ['Banco de Dados', 'SQL'],
        alternatives: [
            { id: 5, text: 'HAVING' },
            { id: 6, text: 'ORDER BY' },
            { id: 7, text: 'WHERE' },
            { id: 8, text: 'DISTINCT' }
        ],
        correctAlternativeId: 5
    },
    {
        id: 3,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual forma normal elimina dependências parciais de atributos não-chave em relação a uma chave composta?',
        tags: ['Banco de Dados', 'Normalização'],
        alternatives: [
            { id: 9, text: 'Primeira Forma Normal (1FN)' },
            { id: 10, text: 'Terceira Forma Normal (3FN)' },
            { id: 11, text: 'Forma Normal de Boyce-Codd (FNBC)' },
            { id: 12, text: 'Segunda Forma Normal (2FN)' }
        ],
        correctAlternativeId: 12
    },
    {
        id: 4,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual operação de JOIN retorna somente linhas com correspondência nas duas tabelas?',
        tags: ['Banco de Dados', 'SQL'],
        alternatives: [
            { id: 13, text: 'LEFT JOIN' },
            { id: 14, text: 'FULL OUTER JOIN' },
            { id: 15, text: 'INNER JOIN' },
            { id: 16, text: 'CROSS JOIN' }
        ],
        correctAlternativeId: 15
    },
    {
        id: 5,
        teacherId: 1,
        type: 'objetiva',
        statement: 'No Scrum, quem é responsável por ordenar o Product Backlog para maximizar o valor do produto?',
        tags: ['Engenharia de Software', 'Métodos Ágeis'],
        alternatives: [
            { id: 17, text: 'Scrum Master' },
            { id: 18, text: 'Product Owner' },
            { id: 19, text: 'Patrocinador do projeto' },
            { id: 20, text: 'Equipe de infraestrutura' }
        ],
        correctAlternativeId: 18
    },
    {
        id: 6,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual princípio SOLID recomenda que uma classe tenha apenas um motivo para mudar?',
        tags: ['Engenharia de Software', 'SOLID'],
        alternatives: [
            { id: 21, text: 'Princípio da Responsabilidade Única' },
            { id: 22, text: 'Princípio Aberto-Fechado' },
            { id: 23, text: 'Princípio da Substituição de Liskov' },
            { id: 24, text: 'Princípio da Inversão de Dependência' }
        ],
        correctAlternativeId: 21
    },
    {
        id: 7,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Em JavaScript, qual declaração cria uma variável com escopo de bloco que pode receber um novo valor?',
        tags: ['Programação', 'JavaScript'],
        alternatives: [
            { id: 25, text: 'var' },
            { id: 26, text: 'const' },
            { id: 27, text: 'let' }
        ],
        correctAlternativeId: 27
    },
    {
        id: 8,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual método HTTP é normalmente usado para substituir integralmente um recurso existente de forma idempotente?',
        tags: ['Programação Web', 'HTTP'],
        alternatives: [
            { id: 28, text: 'POST' },
            { id: 29, text: 'PATCH' },
            { id: 30, text: 'PUT' },
            { id: 31, text: 'CONNECT' }
        ],
        correctAlternativeId: 30
    },
    {
        id: 9,
        teacherId: 1,
        type: 'discursiva',
        statement: 'Explique como a normalização reduz redundâncias e anomalias de atualização em um banco de dados relacional.',
        tags: ['Banco de Dados', 'Normalização'],
        maxScore: 4
    },
    {
        id: 10,
        teacherId: 1,
        type: 'discursiva',
        statement: 'Descreva como testes automatizados apoiam a evolução segura de um sistema de software.',
        tags: ['Engenharia de Software', 'Testes'],
        maxScore: 3
    }
];
