// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    createCorrection,
    getCorrectionFormOptions,
    getVersionQuestions,
    listCorrections
} = vi.hoisted(() => ({
    createCorrection: vi.fn(),
    getCorrectionFormOptions: vi.fn(),
    getVersionQuestions: vi.fn(),
    listCorrections: vi.fn()
}));

vi.mock('vue-router', () => ({
    RouterLink: {
        props: ['to'],
        template: '<a :data-route-name="to.name"><slot /></a>'
    },
    useRoute: () => ({ params: { id: '9' } })
}));

vi.mock('../services/correctionsApi', () => ({
    createCorrection,
    getCorrectionFormOptions,
    getVersionQuestions,
    listCorrections
}));

import CorrecoesView from './CorrecoesView.vue';

const correctionRows = [{
    id: 88,
    applicationId: 9,
    examVersionId: 12,
    versionNumber: 1,
    studentId: 31,
    studentName: 'Ana Souza',
    registration: '20260042',
    status: 'confirmed',
    totalScore: 1.25,
    answeredCount: 1,
    questionCount: 2,
    notes: null
}];

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

const versionResponse = (versionId, questionId, alternativeId) => ({
    versionId,
    applicationId: 9,
    versionNumber: versionId === 12 ? 1 : 2,
    questions: [{
        questionId,
        order: 1,
        statement: `Questao ${questionId}`,
        score: 1.25,
        alternatives: [
            { id: alternativeId, order: 1, text: 'Alternativa A' },
            { id: alternativeId + 1, order: 2, text: 'Alternativa B' }
        ]
    }]
});

beforeEach(() => {
    vi.clearAllMocks();
    listCorrections.mockResolvedValue(correctionRows.map((item) => ({ ...item })));
    getCorrectionFormOptions.mockResolvedValue({
        versions: [{ id: 12, versionNumber: 1 }],
        students: [{ id: 31, fullName: 'Ana Souza', registration: '20260042' }]
    });
    getVersionQuestions.mockResolvedValue({
        versionId: 12,
        applicationId: 9,
        versionNumber: 1,
        questions: [{
            questionId: 101,
            order: 1,
            statement: 'Questao um',
            score: 1.25,
            alternatives: [
                { id: 1001, order: 1, text: 'Alternativa A' },
                { id: 1002, order: 2, text: 'Alternativa B' }
            ]
        }]
    });
    createCorrection.mockResolvedValue({ id: 89, totalScore: 1.25 });
});

describe('tela de correcoes', () => {
    it('lista dados reais com nota e status e mantem pendencias em navegacao separada', async () => {
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        expect(listCorrections).toHaveBeenCalledWith('9', '');
        expect(wrapper.text()).toContain('Ana Souza');
        expect(wrapper.text()).toContain('20260042');
        expect(wrapper.text()).toContain('1,25');
        expect(wrapper.text()).toContain('Confirmada');
        expect(wrapper.get('[data-route-name="application-unidentified-corrections"]'))
            .toBeTruthy();
    });

    it('envia a busca ao servidor e apresenta erro sem inventar registros locais', async () => {
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        await wrapper.get('input[type="search"]').setValue('Ana');
        await wrapper.get('[data-testid="correction-search-form"]').trigger('submit');
        await flushPromises();

        expect(listCorrections).toHaveBeenLastCalledWith('9', 'Ana');

        listCorrections.mockRejectedValueOnce(new Error('Falha ao buscar correcoes.'));
        await wrapper.get('[data-testid="correction-search-form"]').trigger('submit');
        await flushPromises();
        expect(wrapper.get('[data-testid="corrections-error"]').text()).toContain('Falha');
    });

    it('carrega questoes da versao e envia somente os campos permitidos', async () => {
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        await wrapper.get('#correction-version').setValue('12');
        await flushPromises();
        expect(getVersionQuestions).toHaveBeenCalledWith(12);

        await wrapper.get('#correction-student').setValue('31');
        await wrapper.get('input[value="1001"]').setValue(true);
        await wrapper.get('#correction-notes').setValue('  Bom trabalho.  ');
        await wrapper.get('[data-testid="correction-form"]').trigger('submit');
        await flushPromises();

        expect(createCorrection).toHaveBeenCalledWith({
            examVersionId: 12,
            studentId: 31,
            status: 'confirmed',
            notes: 'Bom trabalho.',
            answers: [{ questionId: 101, selectedAlternativeId: 1001 }]
        });
        expect(listCorrections).toHaveBeenLastCalledWith('9', '');
    });

    it('permite resposta em branco e mostra erro do formulario', async () => {
        createCorrection.mockRejectedValueOnce(new Error('Ja existe uma correcao.'));
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        await wrapper.get('#correction-version').setValue('12');
        await flushPromises();
        await wrapper.get('#correction-student').setValue('31');
        await wrapper.get('input[value=""]').setValue(true);
        await wrapper.get('[data-testid="correction-form"]').trigger('submit');
        await flushPromises();

        expect(createCorrection).toHaveBeenCalledWith(expect.objectContaining({
            answers: [{ questionId: 101, selectedAlternativeId: null }]
        }));
        expect(wrapper.get('[data-testid="correction-form-error"]').text())
            .toContain('Ja existe');
    });

    it('ignora uma resposta antiga da mesma versao e preserva a resposta digitada', async () => {
        const firstVersionA = deferred();
        const versionB = deferred();
        const secondVersionA = deferred();
        getCorrectionFormOptions.mockResolvedValueOnce({
            versions: [
                { id: 12, versionNumber: 1 },
                { id: 13, versionNumber: 2 }
            ],
            students: [{ id: 31, fullName: 'Ana Souza', registration: '20260042' }]
        });
        getVersionQuestions
            .mockReturnValueOnce(firstVersionA.promise)
            .mockReturnValueOnce(versionB.promise)
            .mockReturnValueOnce(secondVersionA.promise);
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        const versionSelect = wrapper.get('#correction-version');
        await versionSelect.setValue('12');
        await versionSelect.setValue('13');
        await versionSelect.setValue('12');

        secondVersionA.resolve(versionResponse(12, 101, 1001));
        await flushPromises();
        await wrapper.get('input[value="1001"]').setValue(true);

        firstVersionA.resolve(versionResponse(12, 101, 1001));
        await flushPromises();

        expect(wrapper.get('input[value="1001"]').element.checked).toBe(true);
        versionB.resolve(versionResponse(13, 201, 2001));
        await flushPromises();
    });

    it('encerra o carregamento quando a versao e limpa durante a requisicao', async () => {
        const pendingVersion = deferred();
        getVersionQuestions.mockReturnValueOnce(pendingVersion.promise);
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        const versionSelect = wrapper.get('#correction-version');
        await versionSelect.setValue('12');
        expect(wrapper.text()).toContain('Carregando questões');

        await versionSelect.setValue('');

        expect(wrapper.text()).not.toContain('Carregando questões');
        pendingVersion.resolve(versionResponse(12, 101, 1001));
        await flushPromises();
        expect(wrapper.find('input[value="1001"]').exists()).toBe(false);
    });

    it('recarrega lista, versoes e alunos ao tentar novamente apos falha inicial', async () => {
        getCorrectionFormOptions
            .mockRejectedValueOnce(new Error('Falha inicial.'))
            .mockResolvedValueOnce({
                versions: [{ id: 12, versionNumber: 1 }],
                students: [{ id: 31, fullName: 'Ana Souza', registration: '20260042' }]
            });
        const wrapper = mount(CorrecoesView);
        await flushPromises();

        await wrapper.get('[data-testid="corrections-retry"]').trigger('click');
        await flushPromises();

        expect(getCorrectionFormOptions).toHaveBeenCalledTimes(2);
        expect(wrapper.get('#correction-version').text()).toContain('Versão 1');
        expect(wrapper.get('#correction-student').text()).toContain('Ana Souza');
    });
});
