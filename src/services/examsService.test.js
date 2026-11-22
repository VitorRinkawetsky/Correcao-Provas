import { describe, expect, it } from 'vitest';

import service from './examsService';

describe('validação do payload de provas', () => {
    it('rejeita prova sem nenhuma questão', async () => {
        await expect(
            service.validatePayload({ title: 'Prova de BD', questions: [] }, 1, {})
        ).rejects.toMatchObject({
            status: 400,
            code: 'VALIDATION_ERROR',
            details: [{ field: 'questions', message: expect.stringContaining('ao menos uma questao') }]
        });
    });

    it('rejeita prova sem campo questions', async () => {
        await expect(
            service.validatePayload({ title: 'Prova de BD' }, 1, {})
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });
});
