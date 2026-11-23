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

const validConfig = () => ({
    embaralharQuestoes: true,
    embaralharAlternativas: true,
    identificacao: false
});

describe('validacao do payload de geracao de versoes', () => {
    it('rejeita com 400 quando um item de configuracao nao e um objeto, em vez de quebrar com 500', async () => {
        for (const malformed of [null, 'texto', 42, []]) {
            await expect(
                applicationVersionsService.generateVersions(1, 7, { versoes: [validConfig(), malformed] })
            ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        }
    });

    it('rejeita com 400 fora do intervalo de 1 a 50 versoes', async () => {
        await expect(
            applicationVersionsService.generateVersions(1, 7, { versoes: [] })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });

        await expect(
            applicationVersionsService.generateVersions(1, 7, {
                versoes: Array.from({ length: 51 }, validConfig)
            })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('rejeita antes de validar o payload quando o identificador da aplicacao e invalido', async () => {
        await expect(
            applicationVersionsService.generateVersions('abc', 7, { versoes: [validConfig()] })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });
});
