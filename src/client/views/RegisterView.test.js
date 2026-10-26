// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerProfessor } = vi.hoisted(() => ({
    registerProfessor: vi.fn()
}));

vi.mock('../services/authApi', () => ({ registerProfessor }));

import RegisterView from './RegisterView.vue';

const fillValidForm = async (wrapper) => {
    await wrapper.get('#full-name').setValue('Maria da Silva');
    await wrapper.get('#email').setValue('maria@example.com');
    await wrapper.get('#password').setValue('Senha#2026Segura');
    await wrapper.get('#password-confirmation').setValue('Senha#2026Segura');
};

beforeEach(() => {
    vi.clearAllMocks();
    registerProfessor.mockResolvedValue({
        id: 42,
        fullName: 'Maria da Silva',
        email: 'maria@example.com'
    });
});

describe('tela de cadastro de professor', () => {
    it('não oferece seleção nem conteúdo de conta de aluno', () => {
        const wrapper = mount(RegisterView);

        expect(wrapper.find('select').exists()).toBe(false);
        expect(wrapper.find('input[type="radio"]').exists()).toBe(false);
        expect(wrapper.find('[name="role"]').exists()).toBe(false);
        expect(wrapper.text().toLowerCase()).not.toContain('aluno');
    });

    it('não envia senha fraca ou confirmação divergente', async () => {
        const wrapper = mount(RegisterView, { attachTo: document.body });
        await wrapper.get('#full-name').setValue('Maria da Silva');
        await wrapper.get('#email').setValue('maria@example.com');
        await wrapper.get('#password').setValue('12345678');
        await wrapper.get('#password-confirmation').setValue('outra senha');

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(registerProfessor).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('A senha precisa conter');
        expect(wrapper.text()).toContain('As senhas não coincidem');
        expect(document.activeElement).toBe(wrapper.get('#password').element);
        wrapper.unmount();
    });

    it('não envia e-mail com domínio malformado', async () => {
        const wrapper = mount(RegisterView);
        await fillValidForm(wrapper);
        await wrapper.get('#email').setValue('maria@example..com');

        await wrapper.get('form').trigger('submit');

        expect(registerProfessor).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Informe um e-mail válido');
    });

    it('envia somente os dados do professor e limpa as senhas após sucesso', async () => {
        const wrapper = mount(RegisterView);
        await fillValidForm(wrapper);

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(registerProfessor).toHaveBeenCalledWith({
            fullName: 'Maria da Silva',
            email: 'maria@example.com',
            password: 'Senha#2026Segura'
        });
        expect(wrapper.text()).toContain('Cadastro realizado');
        expect(wrapper.get('#password').element.value).toBe('');
        expect(wrapper.get('#password-confirmation').element.value).toBe('');
    });
});
