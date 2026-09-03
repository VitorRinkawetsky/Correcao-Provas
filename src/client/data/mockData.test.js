import { describe, expect, it } from 'vitest';

import { formatScore, getExamDetails } from './mockData';

describe('dados usados nas telas existentes', () => {
    it('monta os detalhes da primeira prova', () => {
        const exam = getExamDetails(1);

        expect(exam.title).toBe('P1 - Banco de Dados');
        expect(exam.questionCount).toBe(5);
        expect(exam.totalScore).toBe(10);
        expect(formatScore(exam.totalScore)).toBe('10.0');
    });

    it('mantém a ordem e os valores das questões', () => {
        const exam = getExamDetails(1);

        expect(exam.questions.map((question) => question.order)).toEqual([1, 2, 3, 4, 5]);
        expect(exam.questions.map((question) => question.score)).toEqual([1.5, 1.5, 1.5, 1.5, 4]);
    });

    it('retorna nulo para uma prova inexistente', () => {
        expect(getExamDetails(999)).toBeNull();
    });
});
