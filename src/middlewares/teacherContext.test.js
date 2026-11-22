import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTeacherContext } from './teacherContext';

const originalEnvironment = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnvironment };
});

describe('contexto do professor autenticado', () => {
    it('usa o professor configurado no ambiente enquanto nao existe login real', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 1 }]]);
        const middleware = createTeacherContext({ execute });
        const request = {};
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(request.teacher).toEqual({ id: 1 });
        expect(next).toHaveBeenCalledOnce();
    });

    it('usa o professor autenticado quando o contexto de requisicao esta populado', async () => {
        const execute = vi.fn().mockResolvedValue([[{ id: 42 }]]);
        const middleware = createTeacherContext({ execute });
        const request = { authenticatedTeacherId: 42 };
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(request.teacher).toEqual({ id: 42 });
        expect(execute).toHaveBeenCalledWith(expect.stringContaining('is_active = TRUE'), [42]);
    });

    it('rejeita com 401 sem consultar o banco quando nao ha professor valido em produção', async () => {
        process.env.NODE_ENV = 'production';
        const execute = vi.fn();
        const middleware = createTeacherContext({ execute });
        const next = vi.fn();

        await middleware({}, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }));
        expect(execute).not.toHaveBeenCalled();
    });

    it('rejeita com 401 quando o professor identificado nao existe ou esta inativo', async () => {
        const execute = vi.fn().mockResolvedValue([[]]);
        const middleware = createTeacherContext({ execute });
        const request = { authenticatedTeacherId: 999 };
        const next = vi.fn();

        await middleware(request, {}, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }));
        expect(request.teacher).toBeUndefined();
    });
});
