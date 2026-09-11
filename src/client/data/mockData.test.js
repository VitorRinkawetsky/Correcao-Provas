import { describe, expect, it } from 'vitest';

import { formatScore, getAllExams, getExamDetails } from './mockData';

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
