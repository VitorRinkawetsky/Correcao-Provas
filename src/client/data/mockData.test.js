import { describe, expect, it } from 'vitest';

import { createExam, formatScore, getAllExams, getExamDetails, getQuestionShortLabel, updateExam } from './mockData';

describe('dados usados nas telas existentes', () => {
    it('monta os detalhes da primeira prova', () => {
        const exam = getExamDetails(1);

        expect(exam.title).toBe('P1 - Banco de Dados');
        expect(exam.questionCount).toBe(10);
        expect(exam.totalScore).toBe(10);
        expect(formatScore(exam.totalScore)).toBe('10.0');
    });

    it('mantém a ordem e os valores das questões', () => {
        const exam = getExamDetails(1);

        expect(exam.questions.map((question) => question.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(exam.questions.map((question) => question.score)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('retorna nulo para uma prova inexistente', () => {
        expect(getExamDetails(999)).toBeNull();
    });
});

describe('listagem de provas', () => {
    it('lista todas as provas com contagem de questões e status', () => {
        const exams = getAllExams();

        expect(exams).toHaveLength(3);

        const p1 = exams.find((exam) => exam.title === 'P1 - Banco de Dados');
        expect(p1.questionCount).toBe(10);
        expect(p1.status).toBe('ready');

        const p2 = exams.find((exam) => exam.title === 'P2 - SQL');
        expect(p2.questionCount).toBe(8);
        expect(p2.status).toBe('draft');
    });
});

describe('formulário de prova (criar/editar)', () => {
    it('cria uma prova nova com id incremental e as questões informadas', () => {
        const exam = createExam({
            title: 'Prova de teste',
            description: 'Descrição de teste',
            questions: [
                { questionId: 2, order: 1, score: 3 },
                { questionId: 5, order: 2, score: 2 }
            ]
        });

        expect(exam.id).toBeGreaterThan(0);
        expect(exam.status).toBe('draft');

        const details = getExamDetails(exam.id);
        expect(details.title).toBe('Prova de teste');
        expect(details.questionCount).toBe(2);
        expect(details.totalScore).toBe(5);
    });

    it('atualiza título, descrição e questões de uma prova existente', () => {
        const created = createExam({
            title: 'Prova a editar',
            description: 'Antes da edição',
            questions: [{ questionId: 1, order: 1, score: 1 }]
        });

        const updated = updateExam(created.id, {
            title: 'Prova editada',
            description: 'Depois da edição',
            questions: [{ questionId: 1, order: 1, score: 4 }]
        });

        expect(updated.title).toBe('Prova editada');

        const details = getExamDetails(created.id);
        expect(details.description).toBe('Depois da edição');
        expect(details.totalScore).toBe(4);
    });

    it('retorna nulo ao tentar atualizar uma prova inexistente', () => {
        expect(updateExam(999, { title: 'x', description: '', questions: [] })).toBeNull();
    });

    it('deriva um rótulo curto da questão a partir das tags', () => {
        const question = { tags: ['Banco de Dados', 'Normalização'] };
        expect(getQuestionShortLabel(question)).toBe('Normalização');
    });
});
