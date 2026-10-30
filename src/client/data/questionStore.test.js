import { describe, expect, it, vi } from 'vitest';

import {
    corrections,
    exams,
    examVersions,
    questions
} from './testFixtures';

import {
    normalizeTags,
    useQuestionStore,
    validateQuestionInput
} from './questionStore';

const validQuestion = {
    statement: 'O que é normalização?',
    tags: ['Banco de Dados'],
    alternatives: [
        {
            text: 'Organização de dados para reduzir redundâncias.'
        },
        {
            text: 'Cópia integral de todas as tabelas.'
        }
    ],
    correctAlternativeIndex: 0
};

describe('contrato das questões objetivas', () => {
    it('mantém somente questões objetivas com 2 a 5 alternativas e uma resposta correta', () => {
        questions.forEach((question) => {
            expect(question.type).toBe('objetiva');
            expect(question.alternatives.length).toBeGreaterThanOrEqual(2);
            expect(question.alternatives.length).toBeLessThanOrEqual(5);

            expect(
                question.alternatives.some(
                    (alternative) =>
                        alternative.id === question.correctAlternativeId
                )
            ).toBe(true);
        });
    });

    it('não deixa provas, versões ou correções apontarem para questões removidas', () => {
        const questionIds = new Set(
            questions.map((question) => question.id)
        );

        exams
            .flatMap((exam) => exam.questions)
            .forEach(({ questionId }) => {
                expect(questionIds.has(questionId)).toBe(true);
            });

        examVersions
            .flatMap(
                (version) => version.layout.questionOrder
            )
            .forEach((questionId) => {
                expect(questionIds.has(questionId)).toBe(true);
            });

        examVersions
            .flatMap(
                (version) => version.layout.alternativeOrder
            )
            .forEach((alternativeOrder) => {
                const question = questions.find(
                    (item) =>
                        item.id === alternativeOrder.questionId
                );

                expect(question).toBeTruthy();

                expect(
                    [...alternativeOrder.printedOrder].sort(
                        (a, b) => a - b
                    )
                ).toEqual(
                    question.alternatives
                        .map(
                            (alternative) =>
                                alternative.id
                        )
                        .sort((a, b) => a - b)
                );
            });

        corrections
            .flatMap(
                (correction) => correction.objectiveResults
            )
            .forEach(({ questionId }) => {
                expect(questionIds.has(questionId)).toBe(true);
            });

        corrections.forEach((correction) => {
            expect(correction).not.toHaveProperty(
                'discursiveScores'
            );

            expect(correction.totalScore).toBe(
                correction.objectiveResults.reduce(
                    (total, result) =>
                        total + result.score,
                    0
                )
            );
        });
    });
});

describe('validação do formulário de questão', () => {
    it('aceita uma questão objetiva válida', () => {
        expect(
            validateQuestionInput(validQuestion)
        ).toEqual({
            valid: true,
            errors: {}
        });
    });

    it('exige de 2 a 5 alternativas preenchidas', () => {
        const tooFew = validateQuestionInput({
            ...validQuestion,
            alternatives: [
                { text: 'Única alternativa' }
            ]
        });

        const tooMany = validateQuestionInput({
            ...validQuestion,
            alternatives: Array.from(
                { length: 6 },
                (_, index) => ({
                    text: `Alternativa ${index + 1}`
                })
            )
        });

        const blankAlternative =
            validateQuestionInput({
                ...validQuestion,
                alternatives: [
                    { text: 'Preenchida' },
                    { text: ' ' }
                ]
            });

        expect(
            tooFew.errors.alternatives
        ).toBeTruthy();

        expect(
            tooMany.errors.alternatives
        ).toBeTruthy();

        expect(
            blankAlternative.errors.alternatives
        ).toBeTruthy();
    });

    it('exige exatamente uma alternativa correta', () => {
        const result = validateQuestionInput({
            ...validQuestion,
            correctAlternativeIndex: -1
        });

        expect(
            result.errors.correctAlternativeId
        ).toBeTruthy();
    });

    it('normaliza e remove tags duplicadas', () => {
        expect(
            normalizeTags(
                'Banco de Dados, SQL, sql,  '
            )
        ).toEqual([
            'Banco de Dados',
            'SQL'
        ]);
    });

    it('salva uma questão usando a API', async () => {
        const { saveQuestion } =
            useQuestionStore();

        const mockResponse = {
            ok: true,
            json: async () => ({
                status: 'created',
                id: 999
            })
        };

        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(mockResponse);

        await saveQuestion(validQuestion);

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/questions',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                }
            })
        );

        fetchMock.mockRestore();
    });
});

describe('integração da store com /api/questions', () => {
    const mockFetch = (...responses) => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
        return fetchMock;
    };

    it('não envia teacherId no corpo: o professor vem da autenticação', async () => {
        const { saveQuestion } = useQuestionStore();
        const fetchMock = mockFetch(
            { ok: true, json: async () => ({ id: 1 }) },
            { ok: true, json: async () => [] }
        );

        await saveQuestion(validQuestion);

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).not.toHaveProperty('teacherId');
        expect(body.correctAlternativeIndex).toBe(0);
        expect(body.alternatives).toEqual([
            { text: 'Organização de dados para reduzir redundâncias.' },
            { text: 'Cópia integral de todas as tabelas.' }
        ]);

        fetchMock.mockRestore();
    });

    it('propaga a mensagem e os campos inválidos devolvidos pela API', async () => {
        const { saveQuestion } = useQuestionStore();
        const fetchMock = mockFetch({
            ok: false,
            json: async () => ({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Dados invalidos para salvar a questao',
                    details: [{ field: 'alternatives', message: 'Preencha todas' }]
                }
            })
        });

        await expect(saveQuestion(validQuestion, 7)).rejects.toMatchObject({
            message: 'Dados invalidos para salvar a questao',
            validationErrors: { alternatives: 'Preencha todas' }
        });
        expect(fetchMock.mock.calls[0][0]).toBe('/api/questions/7');
        expect(fetchMock.mock.calls[0][1].method).toBe('PUT');

        fetchMock.mockRestore();
    });

    it('carrega a alternativa correta para a edição', async () => {
        const { loadQuestions, getQuestion } = useQuestionStore();
        const fetchMock = mockFetch({
            ok: true,
            json: async () => [{
                id: 42,
                teacherId: 1,
                statement: 'Questão',
                tags: ['SQL'],
                alternatives: [
                    { id: 100, position: 1, text: 'A', isCorrect: false },
                    { id: 101, position: 2, text: 'B', isCorrect: true }
                ],
                correctAlternativeId: 101
            }]
        });

        await loadQuestions();

        expect(getQuestion(42).correctAlternativeId).toBe(101);

        fetchMock.mockRestore();
    });

    it('só remove a questão da lista depois que a API confirma a exclusão', async () => {
        const { loadQuestions, deleteQuestion, getQuestion } = useQuestionStore();
        const list = [{
            id: 5, statement: 'X', tags: [], correctAlternativeId: 1,
            alternatives: [{ id: 1, text: 'A', isCorrect: true }, { id: 2, text: 'B' }]
        }];
        const fetchMock = mockFetch(
            { ok: true, json: async () => list },
            { ok: false, json: async () => ({ error: { message: 'Falhou' } }) },
            { ok: true, json: async () => ({ status: 'archived' }) }
        );

        await loadQuestions();
        await expect(deleteQuestion(5)).rejects.toThrow('Falhou');
        expect(getQuestion(5)).not.toBeNull();

        await deleteQuestion(5);
        expect(getQuestion(5)).toBeNull();

        fetchMock.mockRestore();
    });
});