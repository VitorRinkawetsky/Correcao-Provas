import jsQR from 'jsqr';

export class AnswerSheetCaptureError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'AnswerSheetCaptureError';
        this.code = code;
    }
}

function qrNotFoundError() {
    return new AnswerSheetCaptureError(
        'QR_NOT_FOUND',
        'QR Code não encontrado. Informe o código manualmente ou refaça a foto.'
    );
}

// Lê o QR direto dos pixels, sem depender do BarcodeDetector (que não existe no iPhone).
export function decodeQrFromImageData(imageData, decoder = jsQR) {
    if (!imageData?.data || !imageData.width || !imageData.height) return null;
    const result = decoder(imageData.data, imageData.width, imageData.height);
    const value = String(result?.data || '').trim();
    if (!value) return null;

    const corners = [
        result.location?.topLeftCorner,
        result.location?.topRightCorner,
        result.location?.bottomRightCorner,
        result.location?.bottomLeftCorner
    ].filter(Boolean);
    const center = corners.length
        ? {
            x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
            y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length
        }
        : null;

    return { value, center };
}

// O QR fica no canto superior esquerdo do cartão. Pela posição dele na foto,
// descobre quantos quartos de volta (sentido horário) deixam o cartão em pé.
export function quarterTurnsToUpright(center, width, height) {
    if (!center) return 0;
    const left = center.x < width / 2;
    const top = center.y < height / 2;
    if (left && top) return 0;
    if (left && !top) return 1;
    if (!left && !top) return 2;
    return 3;
}

export function rotateImageData(imageData, quarterTurns) {
    const turns = ((quarterTurns % 4) + 4) % 4;
    if (turns === 0) return imageData;

    const { width, height, data } = imageData;
    const targetWidth = turns === 2 ? width : height;
    const targetHeight = turns === 2 ? height : width;
    const target = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            let targetX;
            let targetY;
            if (turns === 1) {
                targetX = height - 1 - y;
                targetY = x;
            } else if (turns === 2) {
                targetX = width - 1 - x;
                targetY = height - 1 - y;
            } else {
                targetX = y;
                targetY = width - 1 - x;
            }
            const from = ((y * width) + x) * 4;
            const to = ((targetY * targetWidth) + targetX) * 4;
            target[to] = data[from];
            target[to + 1] = data[from + 1];
            target[to + 2] = data[from + 2];
            target[to + 3] = data[from + 3];
        }
    }

    return { data: target, width: targetWidth, height: targetHeight };
}

export async function detectQrCode(source, Detector = globalThis.BarcodeDetector, imageData = null) {
    if (imageData) {
        const decoded = decodeQrFromImageData(imageData);
        if (decoded) return decoded.value;
    }

    if (typeof Detector !== 'function') {
        if (imageData) throw qrNotFoundError();
        throw new AnswerSheetCaptureError(
            'QR_UNSUPPORTED',
            'Leitor de QR Code indisponível neste navegador. Informe o código manualmente.'
        );
    }

    try {
        const detector = new Detector({ formats: ['qr_code'] });
        const codes = await detector.detect(source);
        const value = String(codes[0]?.rawValue || '').trim();
        if (!value) throw qrNotFoundError();
        return value;
    } catch (error) {
        if (error instanceof AnswerSheetCaptureError) throw error;
        throw new AnswerSheetCaptureError(
            'QR_READ_FAILED',
            'Não foi possível ler o QR Code. Informe o código manualmente ou refaça a foto.'
        );
    }
}

function sourceDimensions(source) {
    const width = Number(source?.videoWidth || source?.naturalWidth || source?.width);
    const height = Number(source?.videoHeight || source?.naturalHeight || source?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
        throw new AnswerSheetCaptureError('INVALID_IMAGE', 'A foto selecionada é inválida.');
    }
    return { width, height };
}

export function sourceToImageData(source, {
    maxDimension = 1800,
    createCanvas = () => document.createElement('canvas')
} = {}) {
    const dimensions = sourceDimensions(source);
    const scale = Math.min(1, maxDimension / Math.max(dimensions.width, dimensions.height));
    const width = Math.max(1, Math.round(dimensions.width * scale));
    const height = Math.max(1, Math.round(dimensions.height * scale));
    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new AnswerSheetCaptureError('CANVAS_UNAVAILABLE', 'O navegador não conseguiu processar a foto.');
    }
    context.drawImage(source, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
}

export async function loadImageFile(file, createBitmap = globalThis.createImageBitmap) {
    if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) {
        throw new AnswerSheetCaptureError('INVALID_FILE', 'Selecione uma foto do cartão-resposta.');
    }
    if (typeof createBitmap !== 'function') {
        throw new AnswerSheetCaptureError(
            'IMAGE_DECODE_UNSUPPORTED',
            'Este navegador não conseguiu abrir a foto. Use a câmera ou outro navegador.'
        );
    }
    try {
        return await createBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        throw new AnswerSheetCaptureError('INVALID_FILE', 'Não foi possível abrir a foto selecionada.');
    }
}

export function drawRecognitionPreview(canvas, recognition) {
    if (!canvas || !recognition?.alignedImageData || !recognition?.geometry) return;
    const { alignedImageData, geometry } = recognition;
    canvas.width = alignedImageData.width;
    canvas.height = alignedImageData.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const displayImage = context.createImageData(alignedImageData.width, alignedImageData.height);
    displayImage.data.set(alignedImageData.data);
    context.putImageData(displayImage, 0, 0);
    context.lineWidth = 6;

    recognition.questions.forEach((result, rowIndex) => {
        const row = geometry.rows[rowIndex];
        if (!row) return;
        let bubbleIndexes = [];
        if (result.status === 'marked' || result.status === 'reviewed') {
            bubbleIndexes = result.selectedIndex == null ? [] : [result.selectedIndex];
            context.strokeStyle = '#16a34a';
        } else if (result.status === 'ambiguous') {
            bubbleIndexes = result.ratios
                .map((ratio, index) => ({ ratio, index }))
                .filter(({ ratio }) => ratio >= 0.18)
                .map(({ index }) => index);
            if (bubbleIndexes.length === 0) bubbleIndexes = row.bubbles.map((bubble) => bubble.index);
            context.strokeStyle = '#eab308';
        } else {
            context.strokeStyle = '#64748b';
        }

        bubbleIndexes.forEach((bubbleIndex) => {
            const bubble = row.bubbles[bubbleIndex];
            if (!bubble) return;
            context.beginPath();
            context.arc(bubble.x, bubble.y, bubble.radius + 8, 0, Math.PI * 2);
            context.stroke();
        });
    });
}

export function clearCanvas(canvas) {
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
}
