import { describe, expect, it } from 'vitest';

import service from './questionsService';

const valid = () => ({
    statement: '  O que é normalização?  ',
    tags: ['Banco de Dados', 'banco de dados', ' SQL ', ''],
    alternatives: [{ text: ' A ' }, { text: 'B' }, { text: 'C' }],
    correctAlternativeIndex: 1
});

const fields = (body) => {
    try {
        service.validatePayload(body);
    } catch (error) {
        expect(error.status).toBe(400);
        return error.details.map((detail) => detail.field);
    }
    throw new Error('Era esperado um erro de validação');
};

describe('validação do payload de questões', () => {
    it('normaliza enunciado, tags e alternativas e marca a correta', () => {
        const data = service.validatePayload(valid());

        expect(data.statement).toBe('O que é normalização?');
        expect(data.tags).toEqual(['Banco de Dados', 'SQL']);
        expect(data.alternatives).toEqual([
            { text: 'A', isCorrect: false },
            { text: 'B', isCorrect: true },
            { text: 'C', isCorrect: false }
        ]);
    });

    it('ignora teacherId, type e status enviados no corpo', () => {
        const data = service.validatePayload({
            ...valid(), teacherId: 99, type: 'discursiva', status: 'archived'
        });

        expect(Object.keys(data).sort()).toEqual(['alternatives', 'statement', 'tags']);
    });

    it('exige entre 2 e 5 alternativas', () => {
        expect(fields({ ...valid(), alternatives: [{ text: 'A' }] })).toContain('alternatives');
        expect(fields({
            ...valid(),
            alternatives: ['a', 'b', 'c', 'd', 'e', 'f'].map((text) => ({ text }))
        })).toContain('alternatives');
        expect(fields({ ...valid(), alternatives: undefined })).toContain('alternatives');
    });

    it('aceita 2 e 5 alternativas', () => {
        const two = service.validatePayload({
            ...valid(), alternatives: [{ text: 'A' }, { text: 'B' }], correctAlternativeIndex: 0
        });
        const five = service.validatePayload({
            ...valid(),
            alternatives: ['a', 'b', 'c', 'd', 'e'].map((text) => ({ text })),
            correctAlternativeIndex: 4
        });

        expect(two.alternatives).toHaveLength(2);
        expect(five.alternatives[4].isCorrect).toBe(true);
    });

    it('rejeita alternativas vazias ou só com espaços', () => {
        expect(fields({ ...valid(), alternatives: [{ text: 'A' }, { text: '   ' }] }))
            .toContain('alternatives');
        expect(fields({ ...valid(), alternatives: [{ text: 'A' }, {}] })).toContain('alternatives');
    });

    it('exige enunciado', () => {
        expect(fields({ ...valid(), statement: '   ' })).toContain('statement');
        expect(fields({ ...valid(), statement: 10 })).toContain('statement');
    });

    it('exige exatamente uma alternativa correta', () => {
        expect(fields({ ...valid(), correctAlternativeIndex: undefined }))
            .toContain('correctAlternativeIndex');
        expect(fields({ ...valid(), correctAlternativeIndex: 3 }))
            .toContain('correctAlternativeIndex');
        expect(fields({ ...valid(), correctAlternativeIndex: -1 }))
            .toContain('correctAlternativeIndex');
        expect(fields({ ...valid(), correctAlternativeIndex: '1' }))
            .toContain('correctAlternativeIndex');
        expect(fields({
            statement: 'x',
            alternatives: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }]
        })).toContain('correctAlternativeIndex');
    });

    it('rejeita tags que não sejam lista de textos', () => {
        expect(fields({ ...valid(), tags: 'sql' })).toContain('tags');
        expect(fields({ ...valid(), tags: [1] })).toContain('tags');
    });
});