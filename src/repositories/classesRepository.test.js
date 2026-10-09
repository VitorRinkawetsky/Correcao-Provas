import { describe, expect, it, vi } from 'vitest';

import repository from './classesRepository';

describe('repositorio de turmas', () => {
    it('inativa o vinculo do aluno sem apagar seu historico', async () => {
        const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);

        const affectedRows = await repository.removeStudent(7, 23, { execute });

        expect(affectedRows).toBe(1);
        expect(execute).toHaveBeenCalledWith(
            `UPDATE class_students SET status = 'inactive'
            WHERE class_id = ? AND student_id = ? AND status = 'active'`,
            [7, 23]
        );
    });
});
