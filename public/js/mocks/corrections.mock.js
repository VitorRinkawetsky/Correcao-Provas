export const corrections = [
    {
        id: 1,
        examVersionId: 1,
        studentId: 2,
        objectiveResults: [
            {
                questionId: 1,
                selectedAlternativeId: 2,
                correct: true,
                score: 1.5
            },
            {
                questionId: 2,
                selectedAlternativeId: 5,
                correct: true,
                score: 1.5
            },
            {
                questionId: 3,
                selectedAlternativeId: 9,
                correct: false,
                score: 0
            },
            {
                questionId: 4,
                selectedAlternativeId: 15,
                correct: true,
                score: 1.5
            }
        ],
        discursiveScores: [
            { questionId: 9, score: 3.5 }
        ],
        totalScore: 8,
        notes: 'Boa compreensão geral. Recomenda-se revisar a Segunda Forma Normal.',
        confirmedAt: '2026-08-16T14:30:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 2,
        examVersionId: 2,
        studentId: 3,
        objectiveResults: [
            {
                questionId: 1,
                selectedAlternativeId: 2,
                correct: true,
                score: 1.5
            },
            {
                questionId: 2,
                selectedAlternativeId: 5,
                correct: true,
                score: 1.5
            },
            {
                questionId: 3,
                selectedAlternativeId: 9,
                correct: false,
                score: 0
            },
            {
                questionId: 4,
                selectedAlternativeId: 15,
                correct: true,
                score: 1.5
            }
        ],
        discursiveScores: [
            { questionId: 9, score: 3.8 }
        ],
        totalScore: 8.3,
        notes: null,
        confirmedAt: '2026-08-16T15:10:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 3,
        examVersionId: 3,
        studentId: 4,
        objectiveResults: [
            {
                questionId: 1,
                selectedAlternativeId: 1,
                correct: false,
                score: 0
            },
            {
                questionId: 2,
                selectedAlternativeId: 5,
                correct: true,
                score: 1.5
            },
            {
                questionId: 3,
                selectedAlternativeId: 12,
                correct: true,
                score: 1.5
            },
            {
                questionId: 4,
                selectedAlternativeId: 15,
                correct: true,
                score: 1.5
            }
        ],
        discursiveScores: [
            { questionId: 9, score: 2 }
        ],
        totalScore: 6.5,
        notes: 'A resposta discursiva precisa relacionar melhor redundância e anomalias de atualização.',
        confirmedAt: '2026-08-16T15:45:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 4,
        examVersionId: 4,
        studentId: null,
        reportedStudentName: 'Pedro Santos',
        reportedStudentRegistration: '20260003',
        objectiveResults: [
            {
                questionId: 4,
                selectedAlternativeId: 15,
                correct: true,
                score: 2
            },
            {
                questionId: 7,
                selectedAlternativeId: 27,
                correct: true,
                score: 2
            },
            {
                questionId: 8,
                selectedAlternativeId: 28,
                correct: false,
                score: 0
            }
        ],
        discursiveScores: [
            { questionId: 10, score: 2.5 }
        ],
        totalScore: 6.5,
        notes: 'Aguardando associação manual com um estudante da turma.',
        confirmedAt: '2026-07-27T16:20:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: false,
        syncStatus: 'pending'
    }
];
