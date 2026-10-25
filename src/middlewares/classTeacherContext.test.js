import { describe, expect, it, vi } from 'vitest';

import { createClassTeacherContext } from './classTeacherContext';

describe('contexto do professor das rotas de turmas', () => {
    it('usa o professor autenticado e confirma que ele continua ativo', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 23 }]]);
        const middleware = createClassTeacherContext({ execute });
        const request = {
            authenticatedTeacherId: 23,
            body: { teacher_id: 99 }
        };
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(execute).toHaveBeenCalledWith(
            'SELECT id FROM professors WHERE id = ? AND is_active = TRUE',
            [23]
        );
        expect(request.teacher).toEqual({ id: 23 });
        expect(next).toHaveBeenCalledOnce();
    });

    it('rejeita requisição sem identidade autenticada', async () => {
        const middleware = createClassTeacherContext({ execute: vi.fn() });

        await expect(middleware({ body: { teacher_id: 1 } }, {}, vi.fn()))
            .rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    });

    it('rejeita professor removido ou inativo depois da autenticação', async () => {
        const execute = vi.fn().mockResolvedValue([[]]);
        const middleware = createClassTeacherContext({ execute });

        await expect(middleware({ authenticatedTeacherId: 23 }, {}, vi.fn()))
            .rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    });
});
