// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { push, toDataURL } = vi.hoisted(() => ({
    push: vi.fn(),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR')
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { id: '9' } }),
    useRouter: () => ({ push })
}));

vi.mock('qrcode', () => ({
    default: { toDataURL }
}));

import AplicacaoVersoesView from './AplicacaoVersoesView.vue';

function jsonResponse(body) {
    return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(body))
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn((url) => {
        if (url.endsWith('/assignments')) {
            return jsonResponse({
                data: [{
                    id: 31,
                    versionId: 12,
                    versionNumber: 2,
                    studentName: 'Ana Souza',
                    registration: '20260042',
                    qrCodePayload: 'QR-ANA'
                }]
            });
        }
        if (url.endsWith('/12/answer-key')) {
            return jsonResponse({
                data: {
                    examTitle: 'Banco de Dados',
                    questions: [
                        { questionId: 101, order: 1, correctAlternative: 'B', alternativeCount: 3 },
                        { questionId: 202, order: 2, correctAlternative: 'A', alternativeCount: 2 }
                    ]
                }
            });
        }
        return jsonResponse({
            data: [{
                id: 12,
                versionNumber: 2,
                shuffleQuestions: true,
                shuffleAlternatives: true,
                withStudentIdentification: true,
                qrCodePayload: 'QR-VERSION'
            }]
        });
    }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('cartao-resposta da versao', () => {
    it('abre para impressao o cartao do aluno com a grade real da versao', async () => {
        const wrapper = mount(AplicacaoVersoesView);
        await flushPromises();

        const button = wrapper.findAll('button').find((item) => item.text() === 'Cartão-resposta');
        expect(button).toBeTruthy();
        await button.trigger('click');
        await flushPromises();

        expect(fetch).toHaveBeenCalledWith(
            '/api/application-versions/12/answer-key',
            { credentials: 'include' }
        );
        expect(wrapper.findComponent({ name: 'AnswerSheetPrint' }).props()).toMatchObject({
            identity: 'Ana Souza · Matrícula 20260042',
            versionLabel: 'Versão 2',
            questions: [
                { order: 1, alternativeCount: 3 },
                { order: 2, alternativeCount: 2 }
            ]
        });
    });
});
