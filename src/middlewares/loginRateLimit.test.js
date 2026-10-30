import { describe, expect, it, vi } from 'vitest';

import { createLoginRateLimit } from './loginRateLimit';

const request = (email = 'maria@example.com', ip = '127.0.0.1') => ({
    body: { email },
    ip
});

const response = () => ({ set: vi.fn(), once: vi.fn(), statusCode: 401 });

describe('limite de tentativas de login', () => {
    it('bloqueia novas tentativas da mesma conta durante a janela', () => {
        const middleware = createLoginRateLimit({
            now: () => 1000,
            windowMs: 60000,
            accountMax: 2,
            sourceMax: 20
        });
        const next = vi.fn();

        middleware(request(), response(), next);
        middleware(request(), response(), next);
        const blockedResponse = response();
        middleware(request(), blockedResponse, next);

        expect(next).toHaveBeenLastCalledWith(expect.objectContaining({
            status: 429,
            code: 'TOO_MANY_LOGIN_ATTEMPTS'
        }));
        expect(blockedResponse.set).toHaveBeenCalledWith('Retry-After', '60');
    });

    it('libera a conta depois que a janela expira', () => {
        let currentTime = 1000;
        const middleware = createLoginRateLimit({
            now: () => currentTime,
            windowMs: 60000,
            accountMax: 1,
            sourceMax: 20
        });
        const next = vi.fn();

        middleware(request(), response(), next);
        currentTime += 60001;
        middleware(request(), response(), next);

        expect(next).toHaveBeenLastCalledWith();
    });

    it('limita uma origem que alterna entre muitos e-mails', () => {
        const middleware = createLoginRateLimit({
            now: () => 1000,
            windowMs: 60000,
            accountMax: 20,
            sourceMax: 2
        });
        const next = vi.fn();

        middleware(request('um@example.com'), response(), next);
        middleware(request('dois@example.com'), response(), next);
        middleware(request('tres@example.com'), response(), next);

        expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ status: 429 }));
    });
});
