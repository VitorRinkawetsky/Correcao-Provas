// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ params: {} }),
    useRouter: () => ({ push })
}));

import QuestionFormView from './QuestionFormView.vue';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('formulário de nova questão', () => {
    it('monta o payload a partir do formulário e salva pela API', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

        const wrapper = mount(QuestionFormView);
        await flushPromises();

        await wrapper.find('textarea').setValue('Qual a capital do Brasil?');
        const alternativeInputs = wrapper.findAll('.alternative-text input');
        await alternativeInputs[0].setValue('Brasília');
        await alternativeInputs[1].setValue('Rio de Janeiro');
        await wrapper.findAll('input[type="radio"]')[0].setValue();

        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(fetchMock).toHaveBeenCalledWith('/api/questions', expect.objectContaining({ method: 'POST' }));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toEqual({
            statement: 'Qual a capital do Brasil?',
            tags: [],
            alternatives: [
                { text: 'Brasília' },
                { text: 'Rio de Janeiro' }
            ],
            correctAlternativeIndex: 0
        });

        expect(push).toHaveBeenCalledWith({ name: 'questions', query: { saved: 'created' } });

        fetchMock.mockRestore();
    });

    it('nao envia a requisicao e mostra os erros de campo quando o formulario esta incompleto', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue({ ok: true, json: async () => ({}) });

        const wrapper = mount(QuestionFormView);
        await flushPromises();

        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Informe o enunciado da questão.');
        expect(wrapper.text()).toContain('Preencha o texto de todas as alternativas.');
        expect(wrapper.text()).toContain('Selecione exatamente uma alternativa correta.');
        expect(push).not.toHaveBeenCalled();

        fetchMock.mockRestore();
    });
});
