export class AnswerSheetCaptureError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'AnswerSheetCaptureError';
        this.code = code;
    }
}

export async function detectQrCode(source, Detector = globalThis.BarcodeDetector) {
    if (typeof Detector !== 'function') {
        throw new AnswerSheetCaptureError(
            'QR_UNSUPPORTED',
            'Leitor de QR Code indisponível neste navegador. Informe o código manualmente.'
        );
    }

    try {
        const detector = new Detector({ formats: ['qr_code'] });
        const codes = await detector.detect(source);
        const value = String(codes[0]?.rawValue || '').trim();
        if (!value) {
            throw new AnswerSheetCaptureError(
                'QR_NOT_FOUND',
                'QR Code não encontrado. Informe o código manualmente ou refaça a foto.'
            );
        }
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
