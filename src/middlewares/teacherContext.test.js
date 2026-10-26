import { describe, expect, it, vi } from 'vitest';

import teacherContext from './teacherContext';

describe('contexto autenticado do professor', () => {
    it('usa somente a identidade injetada pelo middleware de sessão', () => {
        const request = {
            authenticatedTeacherId: 23,
            body: { teacher_id: 99, teacherId: 98 },
            headers: { 'x-teacher-id': '97' }
        };
        const next = vi.fn();

        teacherContext(request, {}, next);

        expect(request.teacher).toEqual({ id: 23 });
        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });

    it('retorna 401 sem identidade de sessão, mesmo com teacher_id no corpo', () => {
        const request = { body: { teacher_id: 1 } };
        const next = vi.fn();

        teacherContext(request, {}, next);

        expect(request.teacher).toBeUndefined();
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            status: 401,
            code: 'UNAUTHENTICATED'
        }));
    });
});
