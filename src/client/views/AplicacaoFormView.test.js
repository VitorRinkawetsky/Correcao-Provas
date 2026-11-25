// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn() })
}));

vi.mock('../services/examApi', () => ({
    listExams: vi.fn().mockResolvedValue([{ id: 1, title: 'Prova 1', status: 'ready' }])
}));

vi.mock('../services/classApi', () => ({
    getClasses: vi.fn().mockResolvedValue([{ id: 2, name: 'Turma A', status: 'active' }])
}));

vi.mock('../services/applicationApi', () => ({
    createApplication: vi.fn()
}));

vi.mock('../services/apiClient', () => ({
    requestJson: vi.fn()
}));

import AplicacaoFormView from './AplicacaoFormView.vue';
import AplicacaoGerarView from './AplicacaoGerarView.vue';

const stubs = { RouterLink: { template: '<a><slot /></a>' }, 'router-link': { template: '<a><slot /></a>' } };

describe.each([
    ['Gerar prova', AplicacaoFormView],
    ['Gerar versões', AplicacaoGerarView]
])('quantidade de versões em %s', (_nome, View) => {
    it('permite apagar o número e digitar uma quantidade menor', async () => {
        const wrapper = mount(View, { global: { stubs } });
        await flushPromises();

        const input = wrapper.find('#qtd-versoes');
        expect(wrapper.findAll('.versao-bloco')).toHaveLength(3);

        await input.setValue('');
        expect(input.element.value).toBe('');
        expect(wrapper.findAll('.versao-bloco')).toHaveLength(3);

        await input.setValue('2');
        expect(input.element.value).toBe('2');
        expect(wrapper.findAll('.versao-bloco')).toHaveLength(2);
    });

    it('volta para a quantidade atual ao sair do campo vazio', async () => {
        const wrapper = mount(View, { global: { stubs } });
        await flushPromises();

        const input = wrapper.find('#qtd-versoes');
        await input.setValue('');
        await input.trigger('blur');

        expect(input.element.value).toBe('3');
    });
});
