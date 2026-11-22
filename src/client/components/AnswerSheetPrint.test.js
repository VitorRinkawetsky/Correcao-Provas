// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AnswerSheetPrint from './AnswerSheetPrint.vue';

describe('cartao-resposta imprimivel', () => {
    it('renderiza QR, quatro marcadores e bolhas com a geometria compartilhada', () => {
        const wrapper = mount(AnswerSheetPrint, {
            props: {
                qrDataUrl: 'data:image/png;base64,QR',
                examTitle: 'Banco de Dados',
                identity: 'Ana Souza · 20260042',
                versionLabel: 'Versão 2',
                questions: [
                    { order: 1, alternativeCount: 3 },
                    { order: 2, alternativeCount: 2 }
                ]
            }
        });

        expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 1000 1414');
        expect(wrapper.findAll('.answer-sheet__marker')).toHaveLength(4);
        expect(wrapper.findAll('.answer-sheet__bubble')).toHaveLength(5);
        expect(wrapper.get('.answer-sheet__qr').attributes()).toMatchObject({
            x: '110',
            y: '105',
            width: '210',
            height: '210'
        });
        expect(wrapper.get(
            '[data-row="1"] [data-alternative="B"] .answer-sheet__bubble'
        ).attributes()).toMatchObject({
            cx: '525',
            cy: '330',
            r: '18'
        });
        expect(wrapper.text()).toContain('Ana Souza · 20260042');
    });

    it('recusa uma grade maior que o contrato de 20 questoes', () => {
        expect(() => mount(AnswerSheetPrint, {
            props: {
                qrDataUrl: 'data:image/png;base64,QR',
                examTitle: 'Prova',
                identity: 'Aluno',
                versionLabel: 'Versão 1',
                questions: Array.from({ length: 21 }, (_, index) => ({
                    order: index + 1,
                    alternativeCount: 5
                }))
            }
        })).toThrow(/1 e 20/);
    });
});
