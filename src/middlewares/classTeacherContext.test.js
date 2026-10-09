import { afterEach, describe, expect, it, vi } from 'vitest';

import { createClassTeacherContext } from './classTeacherContext';

const originalEnvironment = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnvironment };
});

describe('contexto do professor das rotas de turmas', () => {
    it('usa o professor configurado no ambiente hospedado enquanto nao existe sessao', async () => {
        process.env.NODE_ENV = 'production';
        process.env.DEFAULT_TEACHER_ID = '1';
        const execute = vi.fn().mockResolvedValue([[{ id: 1 }]]);
        const middleware = createClassTeacherContext({ execute });
        const request = {};
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(request.teacher).toEqual({ id: 1 });
        expect(next).toHaveBeenCalledOnce();
    });

    it('prioriza o professor da sessao sobre o professor configurado', async () => {
        process.env.DEFAULT_TEACHER_ID = '1';
        const execute = vi.fn().mockResolvedValue([[{ id: 23 }]]);
        const middleware = createClassTeacherContext({ execute });
        const request = { session: { teacherId: 23 } };
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(request.teacher).toEqual({ id: 23 });
        expect(next).toHaveBeenCalledOnce();
    });

    it('rejeita um identificador de sessao invalido sem assumir o professor configurado', async () => {
        process.env.DEFAULT_TEACHER_ID = '1';
        const middleware = createClassTeacherContext({ execute: vi.fn() });

        await expect(middleware({ session: { teacherId: 0 } }, {}, vi.fn()))
            .rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    });
});
