import { beforeEach, describe, expect, it, vi } from 'vitest';

import applicationVersionsService from './applicationVersionsService';

const findAnswerKey = vi.fn();
const service = applicationVersionsService.createApplicationVersionsService({
    repository: { findAnswerKey }
});

beforeEach(() => {
    vi.clearAllMocks();
    findAnswerKey.mockResolvedValue([
        {
            versionId: 12,
            versionNumber: 2,
            applicationId: 9,
            examTitle: 'Banco de Dados',
            questionId: 101,
            questionOrder: 1,
            alternativeOrder: 1,
            isCorrect: 0
        },
        {
            versionId: 12,
            versionNumber: 2,
            applicationId: 9,
            examTitle: 'Banco de Dados',
            questionId: 101,
            questionOrder: 1,
            alternativeOrder: 2,
            isCorrect: 1
        },
        {
            versionId: 12,
            versionNumber: 2,
            applicationId: 9,
            examTitle: 'Banco de Dados',
            questionId: 101,
            questionOrder: 1,
            alternativeOrder: 3,
            isCorrect: 0
        },
        {
            versionId: 12,
            versionNumber: 2,
            applicationId: 9,
            examTitle: 'Banco de Dados',
            questionId: 202,
            questionOrder: 2,
            alternativeOrder: 1,
            isCorrect: 1
        },
        {
            versionId: 12,
            versionNumber: 2,
            applicationId: 9,
            examTitle: 'Banco de Dados',
            questionId: 202,
            questionOrder: 2,
            alternativeOrder: 2,
            isCorrect: 0
        }
    ]);
});

describe('gabarito usado pelo cartao-resposta', () => {
    it('informa a quantidade impressa de alternativas de cada questao', async () => {
        const result = await service.getAnswerKey(12, 7);

        expect(result.questions).toEqual([
            { questionId: 101, order: 1, correctAlternative: 'B', alternativeCount: 3 },
            { questionId: 202, order: 2, correctAlternative: 'A', alternativeCount: 2 }
        ]);
        expect(findAnswerKey).toHaveBeenCalledWith(12, 7);
    });
});
