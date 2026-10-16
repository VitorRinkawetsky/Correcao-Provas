
import { describe, expect, it, vi } from 'vitest';

import repository from './applicationVersionsRepository';

describe('repositório de versões e gabaritos', () => {
    it('consulta o gabarito usando a versão e o professor autenticado', async () => {
        const rows = [
            {
                versionId: 3,
                versionNumber: 1,
                applicationId: 8,
                examTitle: 'Prova de teste',
                questionId: 12,
                questionOrder: 1,
                alternativeOrder: 2,
                alternativeText: 'Alternativa B',
                isCorrect: 1,
            },
        ];

        const execute = vi.fn().mockResolvedValue([rows]);
        const result = await repository.findAnswerKey(3, 7, { execute });

        expect(result).toEqual(rows);
        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining('AND a.teacher_id = ?'),
            [3, 7]
        );
        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY evq.printed_order ASC, eva.printed_order ASC'),
            [3, 7]
        );
    });
});