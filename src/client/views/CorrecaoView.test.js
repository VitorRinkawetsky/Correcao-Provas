// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    createCorrection,
    getCorrection,
    getCorrectionContext,
    push,
    route,
    updateCorrection
} = vi.hoisted(() => ({
    createCorrection: vi.fn(),
    getCorrection: vi.fn(),
    getCorrectionContext: vi.fn(),
    push: vi.fn(),
    route: { params: { id: '9' } },
    updateCorrection: vi.fn()
}));

vi.mock('vue-router', () => ({
    useRoute: () => route,
    useRouter: () => ({ push })
}));

vi.mock('../services/correctionApi', () => ({
    createCorrection,
    getCorrection,
    getCorrectionContext,
    updateCorrection
}));

import CorrecaoView from './CorrecaoView.vue';

beforeEach(() => {
    vi.clearAllMocks();
    route.params = { id: '9' };
    getCorrectionContext.mockResolvedValue({
        applicationId: 9,
        examVersionId: 12,
        versionNumber: 1,
        examTitle: 'Banco de Dados',
        assignedStudentId: 31,
        assignedStudentName: 'Ana Souza',
        assignedStudentRegistration: '20260042',
        questions: [{
            questionId: 101,
            printedOrder: 1,
            statement: 'Questao um',
            score: 1.25,
            alternatives: [
                { id: 1001, text: 'Alternativa A' },
                { id: 1002, text: 'Alternativa B' }
            ]
        }]
    });
    getCorrection.mockResolvedValue({
        id: 91,
        applicationId: 9,
        qrCodePayload: 'QR-ABC',
        versionNumber: 1,
        examTitle: 'Banco de Dados',
        studentId: 31,
        studentName: 'Ana Souza',
        studentRegistration: '20260042',
        notes: 'Primeira leitura',
        questions: [{
            questionId: 101,
            printedOrder: 1,
            statement: 'Questao um',
            score: 1.25,
            selectedAlternativeId: 1001,
            isCorrect: true,
            awardedScore: 1.25,
            alternatives: [
                { id: 1001, text: 'Alternativa A', isCorrect: true },
                { id: 1002, text: 'Alternativa B', isCorrect: false }
            ]
        }]
    });
    createCorrection.mockResolvedValue({ id: 91, totalScore: 1.25 });
    updateCorrection.mockResolvedValue({ id: 91, totalScore: 0 });
});

describe('correcao por QR Code', () => {
    it('mantem leitura por camera, entrada manual e criacao pela API QR', async () => {
        const wrapper = mount(CorrecaoView);

        expect(wrapper.text()).toContain('Ler QR Code');
        await wrapper.get('#codigo-prova').setValue('QR-ABC');
        await wrapper.get('.codigo-form').trigger('submit');
        await flushPromises();

        expect(getCorrectionContext).toHaveBeenCalledWith('QR-ABC');
        expect(wrapper.text()).toContain('Banco de Dados');
        expect(wrapper.text()).toContain('Histórico de correções');
        expect(wrapper.text()).toContain('Correções sem aluno');
        const navigationButtons = wrapper.findAll('.atalhos-correcao button');
        await navigationButtons[0].trigger('click');
        await navigationButtons[1].trigger('click');
        expect(push).toHaveBeenCalledWith({
            name: 'application-corrections-list',
            params: { id: 9 }
        });
        expect(push).toHaveBeenCalledWith({
            name: 'application-unidentified-corrections',
            params: { id: 9 }
        });
        await wrapper.get('input[value="1001"]').setValue(true);
        await wrapper.get('.correcao-form').trigger('submit');
        await flushPromises();

        expect(createCorrection).toHaveBeenCalledWith({
            qrCodePayload: 'QR-ABC',
            studentName: 'Ana Souza',
            studentRegistration: '20260042',
            notes: '',
            answers: [{ questionId: 101, selectedAlternativeId: 1001 }]
        });
        expect(push).toHaveBeenCalledWith({
            name: 'correction-details',
            params: { correctionId: 91 }
        });
    });

    it('carrega e edita uma correcao QR persistida mantendo a navegacao da aplicacao', async () => {
        route.params = { correctionId: '91' };
        const wrapper = mount(CorrecaoView);
        await flushPromises();

        expect(getCorrection).toHaveBeenCalledWith('91');
        expect(wrapper.text()).toContain('Revise as respostas');
        expect(wrapper.text()).toContain('· correta');
        expect(wrapper.find('.codigo-form').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Ler QR Code');
        await wrapper.get('input[value="1002"]').setValue(true);
        await wrapper.get('.correcao-form').trigger('submit');
        await flushPromises();

        expect(updateCorrection).toHaveBeenCalledWith('91', {
            studentName: 'Ana Souza',
            studentRegistration: '20260042',
            notes: 'Primeira leitura',
            answers: [{ questionId: 101, selectedAlternativeId: 1002 }]
        });

        await wrapper.get('.voltar').trigger('click');
        expect(push).toHaveBeenCalledWith({
            name: 'application-details',
            params: { id: 9 }
        });
    });
});
