// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
    AnswerSheetCaptureError,
    decodeQrFromImageData,
    detectQrCode,
    quarterTurnsToUpright,
    rotateImageData,
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

    it('le o QR pelos pixels e devolve o centro dele, sem BarcodeDetector', () => {
        const imageData = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 };
        const decoder = vi.fn().mockReturnValue({
            data: ' QR-IPHONE ',
            location: {
                topLeftCorner: { x: 0, y: 0 },
                topRightCorner: { x: 2, y: 0 },
                bottomRightCorner: { x: 2, y: 2 },
                bottomLeftCorner: { x: 0, y: 2 }
            }
        });

        expect(decodeQrFromImageData(imageData, decoder)).toEqual({
            value: 'QR-IPHONE',
            center: { x: 1, y: 1 }
        });
        expect(decodeQrFromImageData(imageData, () => null)).toBeNull();
    });

    it('avisa que o QR nao foi encontrado quando ha foto mas o QR nao e lido', async () => {
        const imageData = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 };

        await expect(detectQrCode({}, undefined, imageData)).rejects.toMatchObject({
            code: 'QR_NOT_FOUND'
        });
    });

    it('calcula quantos quartos de volta deixam o QR no canto superior esquerdo', () => {
        expect(quarterTurnsToUpright({ x: 10, y: 10 }, 100, 200)).toBe(0);
        expect(quarterTurnsToUpright({ x: 10, y: 190 }, 100, 200)).toBe(1);
        expect(quarterTurnsToUpright({ x: 90, y: 190 }, 100, 200)).toBe(2);
        expect(quarterTurnsToUpright({ x: 90, y: 10 }, 100, 200)).toBe(3);
        expect(quarterTurnsToUpright(null, 100, 200)).toBe(0);
    });

    it('gira a imagem em quartos de volta no sentido horario', () => {
        // 2 x 1 pixels: vermelho a esquerda, azul a direita.
        const imageData = {
            data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
            width: 2,
            height: 1
        };

        const quarter = rotateImageData(imageData, 1);
        expect(quarter).toMatchObject({ width: 1, height: 2 });
        expect([...quarter.data]).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);

        const half = rotateImageData(imageData, 2);
        expect([...half.data]).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);

        expect(rotateImageData(imageData, 0)).toBe(imageData);
    });
});
