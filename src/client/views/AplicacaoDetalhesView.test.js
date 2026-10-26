// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getApplication, push } = vi.hoisted(() => ({
    getApplication: vi.fn(),
    push: vi.fn()
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { id: '9' } }),
    useRouter: () => ({ push })
}));

vi.mock('../services/applicationApi', () => ({ getApplication }));

import AplicacaoDetalhesView from './AplicacaoDetalhesView.vue';

beforeEach(() => {
    vi.clearAllMocks();
    getApplication.mockResolvedValue({
        id: 9,
        examTitle: 'Banco de Dados',
        className: 'Turma A',
        status: 'in_correction'
    });
});

describe('detalhes da aplicacao', () => {
    it('separa correcao por QR, historico e pendencias sem aluno', async () => {
        const wrapper = mount(AplicacaoDetalhesView, {
            global: {
                stubs: { RouterLink: { template: '<a><slot /></a>' } }
            }
        });
        await flushPromises();

        const expectations = [
            ['Corrigir por QR Code', 'application-corrections'],
            ['Histórico de correções', 'application-corrections-list'],
            ['Correções sem aluno', 'application-unidentified-corrections']
        ];

        for (const [label, routeName] of expectations) {
            const button = wrapper.findAll('button')
                .find((item) => item.text() === label);
            expect(button).toBeDefined();
            await button.trigger('click');
            expect(push).toHaveBeenLastCalledWith({
                name: routeName,
                params: { id: 9 }
            });
        }
    });
});
