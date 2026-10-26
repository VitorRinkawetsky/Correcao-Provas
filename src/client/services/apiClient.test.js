import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestJson, setUnauthorizedHandler } from './apiClient';

afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
});

describe('cliente HTTP autenticado', () => {
    it('notifica a aplicacao quando uma API rejeita a sessao', async () => {
        const unauthorized = vi.fn();
        setUnauthorizedHandler(unauthorized);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 401,
            ok: false,
            json: vi.fn().mockResolvedValue({
                error: { code: 'UNAUTHENTICATED', message: 'Sessao expirada.' }
            })
        }));

        await expect(requestJson('/api/exams')).rejects.toMatchObject({ status: 401 });

        expect(unauthorized).toHaveBeenCalledWith(expect.objectContaining({
            path: '/api/exams',
            error: expect.objectContaining({ status: 401 })
        }));
    });
});
