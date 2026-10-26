import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { createAuthGuard } from './authGuard';

const route = ({ requiresAuth = false, guestOnly = false, fullPath = '/' } = {}) => ({
    fullPath,
    matched: [{ meta: { requiresAuth, guestOnly } }]
});

const createStore = (authenticated) => ({
    isAuthenticated: ref(authenticated),
    restoreSession: vi.fn().mockResolvedValue(null)
});

describe('guarda de autenticacao', () => {
    it('redireciona visitante de rota protegida para o login', async () => {
        const store = createStore(false);
        const guard = createAuthGuard(store);

        await expect(guard(route({ requiresAuth: true, fullPath: '/provas/7' }))).resolves.toEqual({
            name: 'login',
            query: { redirect: '/provas/7' }
        });
        expect(store.restoreSession).toHaveBeenCalledOnce();
    });

    it('mantem professor autenticado nas rotas protegidas', async () => {
        const store = createStore(true);
        const guard = createAuthGuard(store);

        await expect(guard(route({ requiresAuth: true }))).resolves.toBeUndefined();
        expect(store.restoreSession).toHaveBeenCalledWith({ force: true });
    });

    it('retira professor autenticado das telas exclusivas para visitantes', async () => {
        const guard = createAuthGuard(createStore(true));

        await expect(guard(route({ guestOnly: true, fullPath: '/login' }))).resolves.toEqual({
            name: 'home'
        });
    });
});
