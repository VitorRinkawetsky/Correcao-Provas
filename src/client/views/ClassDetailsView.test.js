// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { archiveClass, getClass, push, regenerateClassInviteCode } = vi.hoisted(() => ({
    archiveClass: vi.fn(),
    getClass: vi.fn(),
    push: vi.fn(),
    regenerateClassInviteCode: vi.fn()
}));

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ params: { id: '7' } }),
    useRouter: () => ({ push })
}));

vi.mock('../services/classApi', () => ({
    addStudentToClass: vi.fn(),
    archiveClass,
    getClass,
    regenerateClassInviteCode,
    removeStudentFromClass: vi.fn()
}));

import ClassDetailsView from './ClassDetailsView.vue';

beforeEach(() => {
    vi.clearAllMocks();
    getClass.mockResolvedValue({
        id: 7,
        name: 'Engenharia de Software',
        subject: 'Banco de Dados',
        term: '2026/2',
        status: 'active',
        inviteCode: 'AB82CD',
        students: []
    });
    archiveClass.mockResolvedValue(null);
    regenerateClassInviteCode.mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('detalhes da turma', () => {
    it('arquiva a turma pela interface e retorna para a listagem', async () => {
        const wrapper = mount(ClassDetailsView);
        await flushPromises();

        await wrapper.get('button[aria-label="Arquivar turma"]').trigger('click');
        await flushPromises();

        expect(archiveClass).toHaveBeenCalledWith('7');
        expect(push).toHaveBeenCalledWith('/turmas');
    });

    it('nao informa arquivamento enquanto outra operacao esta em andamento', async () => {
        let finishRegeneration;
        regenerateClassInviteCode.mockReturnValue(new Promise((resolve) => {
            finishRegeneration = resolve;
        }));
        const wrapper = mount(ClassDetailsView);
        await flushPromises();

        await wrapper.get('.invite-panel .button--primary').trigger('click');

        const archiveButton = wrapper.get('button[aria-label="Arquivar turma"]');
        expect(archiveButton.text()).toBe('Arquivar turma');
        expect(archiveButton.attributes('disabled')).toBeDefined();

        finishRegeneration(await getClass());
        await flushPromises();
    });
});
