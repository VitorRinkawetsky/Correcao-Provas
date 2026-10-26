import { describe, expect, it } from 'vitest';

import authCookie from './authCookie';

const { getSessionCookieOptions } = authCookie;

describe('cookie da sessao', () => {
    it('falha de forma segura quando o ambiente nao foi configurado', () => {
        expect(getSessionCookieOptions('')).toMatchObject({
            httpOnly: true,
            sameSite: 'strict',
            secure: true,
            path: '/'
        });
    });

    it('permite HTTP somente nos ambientes locais explicitos', () => {
        expect(getSessionCookieOptions('development').secure).toBe(false);
        expect(getSessionCookieOptions('test').secure).toBe(false);
        expect(getSessionCookieOptions('production').secure).toBe(true);
        expect(getSessionCookieOptions('producao-digitada-incorretamente').secure).toBe(true);
    });
});
