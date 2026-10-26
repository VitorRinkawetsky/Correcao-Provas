import { computed, reactive } from 'vue';

import {
    getCurrentProfessor,
    loginProfessor,
    logoutProfessor
} from '../services/authApi';

const defaultApi = {
    getCurrentProfessor,
    loginProfessor,
    logoutProfessor
};

export const createAuthStore = (api = defaultApi) => {
    const state = reactive({
        professor: null,
        status: 'unknown',
        error: ''
    });
    const isAuthenticated = computed(() => state.status === 'authenticated'
        && Boolean(state.professor));
    let restorePromise = null;

    const clearSession = (errorMessage = '') => {
        state.professor = null;
        state.status = 'anonymous';
        state.error = errorMessage;
    };

    const restoreSession = ({ force = false } = {}) => {
        if (!force && state.status !== 'unknown' && state.status !== 'loading') {
            return Promise.resolve(state.professor);
        }
        if (restorePromise) return restorePromise;

        state.status = 'loading';
        state.error = '';
        restorePromise = api.getCurrentProfessor()
            .then((professor) => {
                state.professor = professor;
                state.status = 'authenticated';
                return professor;
            })
            .catch((error) => {
                clearSession(error.status === 401
                    ? ''
                    : error.message || 'Não foi possível verificar sua sessão.');
                return null;
            })
            .finally(() => {
                restorePromise = null;
            });

        return restorePromise;
    };

    const login = async (credentials) => {
        state.status = 'loading';
        state.error = '';

        try {
            const professor = await api.loginProfessor(credentials);
            state.professor = professor;
            state.status = 'authenticated';
            return professor;
        } catch (error) {
            state.professor = null;
            state.status = 'anonymous';
            state.error = error.message || 'Não foi possível entrar.';
            throw error;
        }
    };

    const logout = async () => {
        const currentProfessor = state.professor;
        state.status = 'loading';
        state.error = '';

        try {
            await api.logoutProfessor();
            clearSession();
        } catch (error) {
            state.professor = currentProfessor;
            state.status = currentProfessor ? 'authenticated' : 'anonymous';
            state.error = error.message || 'Não foi possível sair.';
            throw error;
        }
    };

    return {
        state,
        isAuthenticated,
        clearSession,
        restoreSession,
        login,
        logout
    };
};

const authStore = createAuthStore();

export const useAuthStore = () => authStore;
