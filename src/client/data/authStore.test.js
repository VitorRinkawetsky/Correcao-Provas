import { describe, expect, it, vi } from 'vitest';

import { createAuthStore } from './authStore';

const professor = {
    id: 42,
    fullName: 'Maria da Silva',
    email: 'maria@example.com'
};

const createApi = (overrides = {}) => ({
    getCurrentProfessor: vi.fn().mockResolvedValue(professor),
    loginProfessor: vi.fn().mockResolvedValue(professor),
    logoutProfessor: vi.fn().mockResolvedValue(null),
    ...overrides
});

describe('authStore', () => {
    it('restaura uma sessao uma unica vez mesmo com chamadas simultaneas', async () => {
        let resolveRequest;
        const request = new Promise((resolve) => {
            resolveRequest = resolve;
        });
        const api = createApi({
            getCurrentProfessor: vi.fn(() => request)
        });
        const store = createAuthStore(api);

        const first = store.restoreSession();
        const second = store.restoreSession();

        expect(api.getCurrentProfessor).toHaveBeenCalledTimes(1);
        expect(store.state.status).toBe('loading');

        resolveRequest(professor);
        await Promise.all([first, second]);

        expect(store.state.professor).toEqual(professor);
        expect(store.state.status).toBe('authenticated');
        expect(store.isAuthenticated.value).toBe(true);
    });

    it('trata uma sessao ausente como visitante anonimo', async () => {
        const error = Object.assign(new Error('Sessao ausente.'), { status: 401 });
        const store = createAuthStore(createApi({
            getCurrentProfessor: vi.fn().mockRejectedValue(error)
        }));

        await expect(store.restoreSession()).resolves.toBeNull();

        expect(store.state.professor).toBeNull();
        expect(store.state.status).toBe('anonymous');
        expect(store.state.error).toBe('');
    });

    it('revalida uma identidade autenticada quando solicitado pelo guard', async () => {
        const api = createApi();
        const store = createAuthStore(api);
        await store.restoreSession();

        await store.restoreSession({ force: true });

        expect(api.getCurrentProfessor).toHaveBeenCalledTimes(2);
        expect(store.state.status).toBe('authenticated');
    });

    it('invalida localmente uma sessao rejeitada por outra chamada da API', async () => {
        const store = createAuthStore(createApi());
        await store.restoreSession();

        store.clearSession();

        expect(store.state.professor).toBeNull();
        expect(store.state.status).toBe('anonymous');
        expect(store.isAuthenticated.value).toBe(false);
    });

    it('atualiza a identidade somente depois de login e logout confirmados', async () => {
        const api = createApi();
        const store = createAuthStore(api);

        await store.login({ email: 'MARIA@example.com ', password: 'senha atual' });

        expect(api.loginProfessor).toHaveBeenCalledWith({
            email: 'MARIA@example.com ',
            password: 'senha atual'
        });
        expect(store.state.professor).toEqual(professor);
        expect(store.state.status).toBe('authenticated');

        await store.logout();

        expect(api.logoutProfessor).toHaveBeenCalledOnce();
        expect(store.state.professor).toBeNull();
        expect(store.state.status).toBe('anonymous');
    });

    it('preserva a identidade quando o servidor nao confirma o logout', async () => {
        const store = createAuthStore(createApi({
            logoutProfessor: vi.fn().mockRejectedValue(new Error('Servidor indisponivel.'))
        }));
        await store.login({ email: professor.email, password: 'senha atual' });

        await expect(store.logout()).rejects.toThrow('Servidor indisponivel.');

        expect(store.state.professor).toEqual(professor);
        expect(store.state.status).toBe('authenticated');
        expect(store.state.error).toBe('Servidor indisponivel.');
    });
});
