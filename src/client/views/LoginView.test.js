// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { login, replace, route } = vi.hoisted(() => ({
    login: vi.fn(),
    replace: vi.fn(),
    route: { query: {} }
}));

vi.mock('vue-router', () => ({
    useRoute: () => route,
    useRouter: () => ({ replace })
}));

vi.mock('../data/authStore', () => ({
    useAuthStore: () => ({ login })
}));

import LoginView from './LoginView.vue';

const fillForm = async (wrapper) => {
    await wrapper.get('#login-email').setValue(' maria@example.com ');
    await wrapper.get('#login-password').setValue('Senha atual');
};

beforeEach(() => {
    vi.clearAllMocks();
    route.query = {};
    login.mockResolvedValue({
        id: 42,
        fullName: 'Maria da Silva',
        email: 'maria@example.com'
    });
});

describe('tela de login de professor', () => {
    it('nao oferece perfil de aluno nem aceita identificador de professor', () => {
        const wrapper = mount(LoginView);

        expect(wrapper.find('select').exists()).toBe(false);
        expect(wrapper.find('input[type="radio"]').exists()).toBe(false);
        expect(wrapper.find('[name="role"]').exists()).toBe(false);
        expect(wrapper.find('[name="teacherId"]').exists()).toBe(false);
        expect(wrapper.find('[name="teacher_id"]').exists()).toBe(false);
        expect(wrapper.text().toLowerCase()).not.toContain('aluno');
    });

    it('exibe carregamento, autentica com e-mail e senha e respeita retorno interno', async () => {
        let resolveLogin;
        login.mockImplementation(() => new Promise((resolve) => {
            resolveLogin = resolve;
        }));
        route.query = { redirect: '/provas/7' };
        const wrapper = mount(LoginView);
        await fillForm(wrapper);

        await wrapper.get('form').trigger('submit');

        expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('button[type="submit"]').text()).toContain('Entrando');
        expect(login).toHaveBeenCalledWith({
            email: 'maria@example.com',
            password: 'Senha atual'
        });

        resolveLogin({ id: 42 });
        await flushPromises();

        expect(replace).toHaveBeenCalledWith('/provas/7');
    });

    it('mostra a falha de credencial e libera nova tentativa', async () => {
        login.mockRejectedValue(Object.assign(new Error('E-mail ou senha invalidos.'), {
            status: 401
        }));
        const wrapper = mount(LoginView);
        await fillForm(wrapper);

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toContain('E-mail ou senha invalidos.');
        expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('#login-password').element.value).toBe('');
    });

    it('ignora redirecionamento externo depois do login', async () => {
        route.query = { redirect: '//site-malicioso.example' };
        const wrapper = mount(LoginView);
        await fillForm(wrapper);

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(replace).toHaveBeenCalledWith('/');
    });
});
