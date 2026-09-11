import { describe, expect, it } from 'vitest';

import { formatScore, getClassDetails, getClassSummaries, getExamDetails } from './mockData';

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

    it('monta os detalhes da primeira turma', () => {
        const classItem = getClassDetails(1);

        expect(classItem.name).toBe('Engenharia de Software - 4ª fase');
        expect(classItem.subject).toBe('Banco de Dados');
        expect(classItem.term).toBe('2026/2');
        expect(classItem.inviteCode).toBe('AB82CD');
        expect(classItem.students.map((student) => student.fullName)).toEqual([
            'João Silva',
            'Maria Oliveira',
            'Pedro Souza'
        ]);
    });

    it('lista as turmas disponíveis para navegação', () => {
        const classSummaries = getClassSummaries();

        expect(classSummaries).toHaveLength(2);
        expect(classSummaries[0]).toMatchObject({
            id: 1,
            name: 'Engenharia de Software - 4ª fase',
            subject: 'Banco de Dados',
            term: '2026/2',
            studentCount: 3
        });
    });
});
