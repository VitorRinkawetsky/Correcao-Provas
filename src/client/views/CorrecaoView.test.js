// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    createCorrection,
    clearCanvas,
    detectQrCode,
    drawRecognitionPreview,
    getCorrection,
    getCorrectionContext,
    loadImageFile,
    push,
    recognizeAnswerSheet,
    route,
    sourceToImageData,
    updateCorrection
} = vi.hoisted(() => ({
    createCorrection: vi.fn(),
    clearCanvas: vi.fn(),
    detectQrCode: vi.fn(),
    drawRecognitionPreview: vi.fn(),
    getCorrection: vi.fn(),
    getCorrectionContext: vi.fn(),
    loadImageFile: vi.fn(),
    push: vi.fn(),
    recognizeAnswerSheet: vi.fn(),
    route: { params: { id: '9' } },
    sourceToImageData: vi.fn(),
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

vi.mock('../services/answerSheetCapture', () => ({
    clearCanvas,
    detectQrCode,
    drawRecognitionPreview,
    loadImageFile,
    sourceToImageData
}));

vi.mock('../services/answerSheetReader', () => ({
    recognizeAnswerSheet
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
    detectQrCode.mockResolvedValue('QR-ABC');
    const bitmap = { width: 1000, height: 1414, close: vi.fn() };
    loadImageFile.mockResolvedValue(bitmap);
    sourceToImageData.mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
    });
    recognizeAnswerSheet.mockReturnValue({
        alignedImageData: { data: new Uint8ClampedArray(4), width: 1, height: 1 },
        geometry: { rows: [] },
        questions: [{
            questionId: 101,
            status: 'marked',
            selectedIndex: 1,
            ratios: [0.05, 0.82]
        }]
    });
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

    it('le a foto, preenche o id da alternativa impressa e salva pelo fluxo atual', async () => {
        const wrapper = mount(CorrecaoView);
        const fileInput = wrapper.get('input[type="file"]');
        const file = new File(['foto'], 'cartao.jpg', { type: 'image/jpeg' });
        Object.defineProperty(fileInput.element, 'files', {
            configurable: true,
            value: [file]
        });

        await fileInput.trigger('change');
        await flushPromises();

        expect(detectQrCode).toHaveBeenCalled();
        expect(getCorrectionContext).toHaveBeenCalledWith('QR-ABC');
        expect(recognizeAnswerSheet).toHaveBeenCalledWith(
            expect.any(Object),
            expect.arrayContaining([expect.objectContaining({ questionId: 101 })])
        );
        expect(wrapper.get('input[value="1002"]').element.checked).toBe(true);
        expect(wrapper.text()).toContain('1 resposta lida');

        await wrapper.get('.correcao-form').trigger('submit');
        await flushPromises();

        expect(createCorrection).toHaveBeenCalledWith(expect.objectContaining({
            qrCodePayload: 'QR-ABC',
            answers: [{ questionId: 101, selectedAlternativeId: 1002 }]
        }));
        expect(wrapper.text()).toContain('Nota: 1.25');
    });

    it('preserva contexto e respostas anteriores quando uma nova foto falha', async () => {
        const wrapper = mount(CorrecaoView);
        await wrapper.get('#codigo-prova').setValue('QR-ABC');
        await wrapper.get('.codigo-form').trigger('submit');
        await flushPromises();
        await wrapper.get('input[value="1001"]').setValue(true);

        getCorrectionContext.mockResolvedValueOnce({
            applicationId: 9,
            examVersionId: 13,
            versionNumber: 2,
            examTitle: 'Outra prova',
            assignedStudentId: 32,
            assignedStudentName: 'Beatriz Lima',
            assignedStudentRegistration: '20260099',
            questions: [{
                questionId: 202,
                printedOrder: 1,
                statement: 'Outra questao',
                score: 2,
                alternatives: [
                    { id: 2001, text: 'Alternativa A' },
                    { id: 2002, text: 'Alternativa B' }
                ]
            }]
        });
        detectQrCode.mockResolvedValueOnce('QR-NOVO');
        recognizeAnswerSheet.mockImplementationOnce(() => {
            throw new Error('Não foi possível ler o cartão. Refaça a foto.');
        });
        const fileInput = wrapper.get('input[type="file"]');
        Object.defineProperty(fileInput.element, 'files', {
            configurable: true,
            value: [new File(['foto'], 'cortada.jpg', { type: 'image/jpeg' })]
        });

        await fileInput.trigger('change');
        await flushPromises();

        expect(wrapper.get('#codigo-prova').element.value).toBe('QR-ABC');
        expect(wrapper.findAll('.identificacao input')[0].element.value).toBe('Ana Souza');
        expect(wrapper.findAll('.identificacao input')[1].element.value).toBe('20260042');
        expect(wrapper.get('input[value="1001"]').element.checked).toBe(true);
        expect(wrapper.text()).toContain('Refaça a foto');
    });

    it('salva com o QR do contexto carregado mesmo se o campo for editado depois', async () => {
        const wrapper = mount(CorrecaoView);
        await wrapper.get('#codigo-prova').setValue('QR-ABC');
        await wrapper.get('.codigo-form').trigger('submit');
        await flushPromises();
        await wrapper.get('input[value="1001"]').setValue(true);
        await wrapper.get('#codigo-prova').setValue('QR-NAO-CARREGADO');

        await wrapper.get('.correcao-form').trigger('submit');
        await flushPromises();

        expect(createCorrection).toHaveBeenCalledWith(expect.objectContaining({
            qrCodePayload: 'QR-ABC',
            answers: [{ questionId: 101, selectedAlternativeId: 1001 }]
        }));
    });
});
