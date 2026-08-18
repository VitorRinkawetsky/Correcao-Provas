export const exams = [
    {
        id: 1,
        teacherId: 1,
        title: 'P1 - Banco de Dados',
        description: 'Primeira avaliação da disciplina de Banco de Dados.',
        questions: [
            { questionId: 1, order: 1, score: 1.5 },
            { questionId: 2, order: 2, score: 1.5 },
            { questionId: 3, order: 3, score: 1.5 },
            { questionId: 4, order: 4, score: 1.5 },
            { questionId: 9, order: 5, score: 4 }
        ],
        status: 'ready',
        createdAt: '2026-08-10T10:00:00.000Z'
    },
    {
        id: 2,
        teacherId: 1,
        title: 'Projeto e Qualidade de Software',
        description: 'Avaliação em elaboração sobre práticas de Engenharia de Software.',
        questions: [
            { questionId: 5, order: 1, score: 2 },
            { questionId: 6, order: 2, score: 2 },
            { questionId: 7, order: 3, score: 2 },
            { questionId: 10, order: 4, score: 4 }
        ],
        status: 'draft',
        createdAt: '2026-08-12T13:30:00.000Z'
    },
    {
        id: 3,
        teacherId: 1,
        title: 'Fundamentos de Programação Web',
        description: 'Avaliação sobre JavaScript, HTTP e integração com dados relacionais.',
        questions: [
            { questionId: 4, order: 1, score: 2 },
            { questionId: 7, order: 2, score: 2 },
            { questionId: 8, order: 3, score: 2 },
            { questionId: 10, order: 4, score: 4 }
        ],
        status: 'closed',
        createdAt: '2026-07-20T14:00:00.000Z'
    }
];
