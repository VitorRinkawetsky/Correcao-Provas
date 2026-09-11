import { describe, expect, it } from 'vitest';

import { corrections, exams, examVersions, questions } from './mockData';
import { normalizeTags, useQuestionStore, validateQuestionInput } from './questionStore';

const validQuestion = {
    statement: 'O que é normalização?',
    tags: ['Banco de Dados'],
    alternatives: [
        { text: 'Organização de dados para reduzir redundâncias.' },
        { text: 'Cópia integral de todas as tabelas.' }
    ],
    correctAlternativeIndex: 0
};

describe('contrato das questões objetivas', () => {
    it('mantém somente questões objetivas com 2 a 5 alternativas e uma resposta correta', () => {
        questions.forEach((question) => {
            expect(question.type).toBe('objetiva');
            expect(question.alternatives.length).toBeGreaterThanOrEqual(2);
            expect(question.alternatives.length).toBeLessThanOrEqual(5);
            expect(question.alternatives.some(
                (alternative) => alternative.id === question.correctAlternativeId
            )).toBe(true);
        });
    });

    it('não deixa provas, versões ou correções apontarem para questões removidas', () => {
        const questionIds = new Set(questions.map((question) => question.id));

        exams.flatMap((exam) => exam.questions).forEach(({ questionId }) => {
            expect(questionIds.has(questionId)).toBe(true);
        });
        examVersions.flatMap((version) => version.layout.questionOrder).forEach((questionId) => {
            expect(questionIds.has(questionId)).toBe(true);
        });
        examVersions.flatMap((version) => version.layout.alternativeOrder).forEach((alternativeOrder) => {
            const question = questions.find((item) => item.id === alternativeOrder.questionId);
            expect(question).toBeTruthy();
            expect([...alternativeOrder.printedOrder].sort((a, b) => a - b)).toEqual(
                question.alternatives.map((alternative) => alternative.id).sort((a, b) => a - b)
            );
        });
        corrections.flatMap((correction) => correction.objectiveResults).forEach(({ questionId }) => {
            expect(questionIds.has(questionId)).toBe(true);
        });
        corrections.forEach((correction) => {
            expect(correction).not.toHaveProperty('discursiveScores');
            expect(correction.totalScore).toBe(
                correction.objectiveResults.reduce((total, result) => total + result.score, 0)
            );
        });
    });
});

describe('validação do formulário de questão', () => {
    it('aceita uma questão objetiva válida', () => {
        expect(validateQuestionInput(validQuestion)).toEqual({ valid: true, errors: {} });
    });

    it('exige de 2 a 5 alternativas preenchidas', () => {
        const tooFew = validateQuestionInput({
            ...validQuestion,
            alternatives: [{ text: 'Única alternativa' }]
        });
        const tooMany = validateQuestionInput({
            ...validQuestion,
            alternatives: Array.from({ length: 6 }, (_, index) => ({ text: `Alternativa ${index + 1}` }))
        });
        const blankAlternative = validateQuestionInput({
            ...validQuestion,
            alternatives: [{ text: 'Preenchida' }, { text: ' ' }]
        });

        expect(tooFew.errors.alternatives).toBeTruthy();
        expect(tooMany.errors.alternatives).toBeTruthy();
        expect(blankAlternative.errors.alternatives).toBeTruthy();
    });

    it('exige exatamente uma alternativa correta', () => {
        const result = validateQuestionInput({
            ...validQuestion,
            correctAlternativeIndex: -1
        });

        expect(result.errors.correctAlternativeId).toBeTruthy();
    });

    it('normaliza e remove tags duplicadas', () => {
        expect(normalizeTags('Banco de Dados, SQL, sql,  ')).toEqual(['Banco de Dados', 'SQL']);
    });

    it('cria, edita e exclui uma questão no repositório local', () => {
        const { questions: storedQuestions, getQuestion, saveQuestion, deleteQuestion } = useQuestionStore();
        const initialCount = storedQuestions.value.length;
        const createdQuestion = saveQuestion(validQuestion);

        expect(storedQuestions.value).toHaveLength(initialCount + 1);
        expect(getQuestion(createdQuestion.id)?.statement).toBe(validQuestion.statement);

        saveQuestion({
            ...validQuestion,
            statement: 'O que é normalização de dados?'
        }, createdQuestion.id);
        expect(getQuestion(createdQuestion.id)?.statement).toBe('O que é normalização de dados?');

        expect(deleteQuestion(createdQuestion.id)).toBe(true);
        expect(storedQuestions.value).toHaveLength(initialCount);
    });
});
