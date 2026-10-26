// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logout, replace, state } = vi.hoisted(() => ({
    logout: vi.fn(),
    replace: vi.fn(),
    state: {
        professor: {
            id: 42,
            fullName: 'Maria da Silva',
            email: 'maria@example.com'
        }
    }
}));

vi.mock('vue-router', async () => {
    const { defineComponent, h } = await import('vue');
    return {
        RouterLink: defineComponent({
            props: ['to'],
            setup: (_props, { slots }) => () => h('a', slots.default?.())
        }),
        RouterView: defineComponent({ setup: () => () => h('div') }),
        useRouter: () => ({ replace })
    };
});

vi.mock('../../data/authStore', () => ({
    useAuthStore: () => ({ state, logout })
}));

import AppShell from './AppShell.vue';

beforeEach(() => {
    vi.clearAllMocks();
    logout.mockResolvedValue(null);
});

describe('conta do professor no cabecalho', () => {
    it('mostra a identidade autenticada e encerra a sessao', async () => {
        const wrapper = mount(AppShell);

        expect(wrapper.text()).toContain('Maria da Silva');
        expect(wrapper.text()).toContain('maria@example.com');

        await wrapper.get('.teacher-account__logout').trigger('click');
        await flushPromises();

        expect(logout).toHaveBeenCalledOnce();
        expect(replace).toHaveBeenCalledWith({ name: 'login' });
    });

    it('mantem a tela e informa quando o logout nao e confirmado', async () => {
        logout.mockRejectedValue(new Error('Servidor indisponivel.'));
        const wrapper = mount(AppShell);

        await wrapper.get('.teacher-account__logout').trigger('click');
        await flushPromises();

        expect(replace).not.toHaveBeenCalled();
        expect(wrapper.get('[role="alert"]').text()).toContain('Servidor indisponivel.');
    });
});
