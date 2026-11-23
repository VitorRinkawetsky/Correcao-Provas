// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
    AnswerSheetCaptureError,
    detectQrCode,
    sourceToImageData
} from './answerSheetCapture';

describe('captura do cartao-resposta no navegador', () => {
    it('le somente QR Code e devolve o payload sem alterar a imagem', async () => {
        class FakeBarcodeDetector {
            constructor(options) {
                expect(options).toEqual({ formats: ['qr_code'] });
            }

            detect(source) {
                expect(source).toBe(sourceImage);
                return Promise.resolve([{ rawValue: 'QR-ALUNO-42' }]);
            }
        }
        const sourceImage = { width: 1000, height: 1414 };

        await expect(detectQrCode(sourceImage, FakeBarcodeDetector)).resolves.toBe('QR-ALUNO-42');
    });

    it('informa indisponibilidade quando o navegador nao possui BarcodeDetector', async () => {
        await expect(detectQrCode({}, undefined)).rejects.toMatchObject({
            name: 'AnswerSheetCaptureError',
            code: 'QR_UNSUPPORTED'
        });
        await expect(detectQrCode({}, undefined)).rejects.toBeInstanceOf(AnswerSheetCaptureError);
    });

    it('reduz a foto antes de extrair pixels para limitar memoria no celular', () => {
        const expected = {
            data: new Uint8ClampedArray(1200 * 600 * 4),
            width: 1200,
            height: 600
        };
        const context = {
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue(expected)
        };
        const canvas = {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(context)
        };
        const source = { naturalWidth: 2400, naturalHeight: 1200 };

        const result = sourceToImageData(source, {
            maxDimension: 1200,
            createCanvas: () => canvas
        });

        expect(result).toBe(expected);
        expect(canvas).toMatchObject({ width: 1200, height: 600 });
        expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0, 1200, 600);
    });
});
