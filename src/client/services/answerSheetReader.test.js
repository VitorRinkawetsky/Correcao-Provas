import { describe, expect, it } from 'vitest';

import {
    ANSWER_SHEET_LAYOUT,
    getAnswerSheetGeometry
} from '../../shared/answerSheetLayout';
import {
    AnswerSheetReadError,
    recognizeAnswerSheet
} from './answerSheetReader';

function setPixel(image, x, y, value) {
    if (x < 0 || x >= image.width || y < 0 || y >= image.height) return;
    const offset = ((y * image.width) + x) * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
}

function fillRect(image, x, y, width, height, value = 0) {
    for (let currentY = y; currentY < y + height; currentY += 1) {
        for (let currentX = x; currentX < x + width; currentX += 1) {
            setPixel(image, currentX, currentY, value);
        }
    }
}

function drawDisk(image, centerX, centerY, radius, value = 0) {
    const radiusSquared = radius * radius;
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
        for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
            if (((x - centerX) ** 2) + ((y - centerY) ** 2) <= radiusSquared) {
                setPixel(image, x, y, value);
            }
        }
    }
}

function drawRing(image, centerX, centerY, radius) {
    const outer = radius * radius;
    const inner = (radius - 2) * (radius - 2);
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
        for (let x = centerX - radius; x <= centerX + radius; x += 1) {
            const distance = ((x - centerX) ** 2) + ((y - centerY) ** 2);
            if (distance <= outer && distance >= inner) setPixel(image, x, y, 0);
        }
    }
}

function syntheticSheet(alternativeCounts, markedByRow = {}) {
    const width = 1000;
    const height = 1414;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);
    for (let index = 3; index < data.length; index += 4) data[index] = 255;
    const image = { data, width, height };

    const markerBoxes = [
        [42, 42],
        [904, 42],
        [904, 1318],
        [42, 1318]
    ];
    markerBoxes.forEach(([x, y]) => fillRect(image, x, y, 54, 54));

    const geometry = getAnswerSheetGeometry(alternativeCounts);
    geometry.rows.forEach((row, rowIndex) => {
        row.bubbles.forEach((bubble) => drawRing(
            image,
            Math.round(bubble.x),
            Math.round(bubble.y),
            bubble.radius
        ));
        (markedByRow[rowIndex] || []).forEach((alternativeIndex) => {
            const bubble = row.bubbles[alternativeIndex];
            drawDisk(image, bubble.x, bubble.y, Math.floor(bubble.radius * 0.68));
        });
    });

    return image;
}

function cropImage(image, { left = 0, top = 0, right = 0, bottom = 0 }) {
    const width = image.width - left - right;
    const height = image.height - top - bottom;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        const sourceStart = (((y + top) * image.width) + left) * 4;
        const targetStart = y * width * 4;
        data.set(image.data.subarray(sourceStart, sourceStart + (width * 4)), targetStart);
    }
    return { data, width, height };
}

function questions(alternativeCounts) {
    return alternativeCounts.map((alternativeCount, index) => ({
        questionId: 100 + index,
        alternatives: Array.from({ length: alternativeCount }, (_, alternativeIndex) => ({
            id: 1000 + (index * 10) + alternativeIndex
        }))
    }));
}

describe('layout compartilhado do cartão-resposta', () => {
    it('mantem as medidas canonicas e as 20 linhas dentro da pagina', () => {
        const geometry = getAnswerSheetGeometry(Array(20).fill(5));

        expect(ANSWER_SHEET_LAYOUT.page).toEqual({ width: 1000, height: 1414 });
        expect(geometry.markers.map(({ centerX, centerY }) => [centerX, centerY])).toEqual([
            [69, 69],
            [931, 69],
            [931, 1345],
            [69, 1345]
        ]);
        expect(geometry.rows[0].bubbles.map(({ x, y }) => [x, y])).toEqual([
            [420, 330],
            [525, 330],
            [630, 330],
            [735, 330],
            [840, 330]
        ]);
        expect(geometry.rows[19].bubbles[4]).toMatchObject({ x: 840, y: 1204, radius: 18 });
    });

    it('rejeita quantidades que nao cabem no contrato impresso', () => {
        expect(() => getAnswerSheetGeometry([])).toThrow(/1 e 20/);
        expect(() => getAnswerSheetGeometry(Array(21).fill(4))).toThrow(/1 e 20/);
        expect(() => getAnswerSheetGeometry([1])).toThrow(/2 e 5/);
        expect(() => getAnswerSheetGeometry([6])).toThrow(/2 e 5/);
    });
});

describe('leitura automatica do cartao-resposta', () => {
    it('le uma marca unica e preserva linhas em branco em um cartao de 5 questoes', () => {
        const counts = [5, 5, 4, 4, 2];
        const image = syntheticSheet(counts, { 0: [1], 2: [3], 4: [0] });

        const result = recognizeAnswerSheet(image, questions(counts));

        expect(result.questions.map(({ status, selectedIndex }) => ({ status, selectedIndex }))).toEqual([
            { status: 'marked', selectedIndex: 1 },
            { status: 'blank', selectedIndex: null },
            { status: 'marked', selectedIndex: 3 },
            { status: 'blank', selectedIndex: null },
            { status: 'marked', selectedIndex: 0 }
        ]);
    });

    it('marca duas bolhas preenchidas como rasura para revisao', () => {
        const counts = Array(5).fill(5);
        const image = syntheticSheet(counts, { 1: [0, 3] });

        const result = recognizeAnswerSheet(image, questions(counts));

        expect(result.questions[1]).toMatchObject({
            status: 'ambiguous',
            selectedIndex: null
        });
        expect(result.questions[1].ratios[0]).toBeGreaterThan(0.38);
        expect(result.questions[1].ratios[3]).toBeGreaterThan(0.38);
    });

    it('le a ultima linha de um cartao com 20 questoes', () => {
        const counts = Array(20).fill(5);
        const image = syntheticSheet(counts, { 19: [4] });

        const result = recognizeAnswerSheet(image, questions(counts));

        expect(result.questions).toHaveLength(20);
        expect(result.questions[19]).toMatchObject({ status: 'marked', selectedIndex: 4 });
    });

    it('pede nova foto sem preencher parcialmente quando falta marcador', () => {
        const counts = Array(5).fill(5);
        const image = syntheticSheet(counts, { 0: [2] });
        fillRect(image, 42, 1318, 54, 54, 255);

        expect(() => recognizeAnswerSheet(image, questions(counts))).toThrow(AnswerSheetReadError);
        expect(() => recognizeAnswerSheet(image, questions(counts))).toThrow(/Refaça a foto/);
    });

    it('rejeita marcador parcialmente cortado pela borda da foto', () => {
        const counts = Array(5).fill(5);
        const complete = syntheticSheet(counts, { 0: [2] });
        const cropped = cropImage(complete, { left: 57 });

        expect(() => recognizeAnswerSheet(cropped, questions(counts))).toThrow(AnswerSheetReadError);
        expect(() => recognizeAnswerSheet(cropped, questions(counts))).toThrow(/Refaça a foto/);
    });
});
