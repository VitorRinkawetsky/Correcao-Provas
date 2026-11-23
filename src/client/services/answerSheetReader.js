import { getAnswerSheetGeometry } from '../../shared/answerSheetLayout';

const DEFAULT_OPTIONS = Object.freeze({
    adaptiveBlockSize: 48,
    adaptiveOffset: 10,
    markedThreshold: 0.38,
    blankThreshold: 0.18,
    winnerMargin: 0.12,
    samplingRadiusFactor: 0.62
});

export class AnswerSheetReadError extends Error {
    constructor(code, detail) {
        super(`Não foi possível ler o cartão. Refaça a foto${detail ? `: ${detail}` : '.'}`);
        this.name = 'AnswerSheetReadError';
        this.code = code;
    }
}

function assertImageData(imageData) {
    if (
        !imageData
        || !Number.isInteger(imageData.width)
        || !Number.isInteger(imageData.height)
        || imageData.width < 2
        || imageData.height < 2
        || imageData.data?.length !== imageData.width * imageData.height * 4
    ) {
        throw new TypeError('Imagem RGBA inválida.');
    }
}

export function rgbaToGrayscale(imageData) {
    assertImageData(imageData);
    const grayscale = new Uint8ClampedArray(imageData.width * imageData.height);
    for (let source = 0, target = 0; source < imageData.data.length; source += 4, target += 1) {
        grayscale[target] = Math.round(
            (imageData.data[source] * 0.299)
            + (imageData.data[source + 1] * 0.587)
            + (imageData.data[source + 2] * 0.114)
        );
    }
    return grayscale;
}

export function assessImageQuality(grayscale, width, height) {
    const step = Math.max(1, Math.floor(Math.min(width, height) / 500));
    let count = 0;
    let sum = 0;
    let squareSum = 0;
    let edgeSquareSum = 0;
    let edgeCount = 0;

    for (let y = step; y < height - step; y += step) {
        for (let x = step; x < width - step; x += step) {
            const value = grayscale[(y * width) + x];
            count += 1;
            sum += value;
            squareSum += value * value;

            const laplacian = (
                (4 * value)
                - grayscale[(y * width) + x - step]
                - grayscale[(y * width) + x + step]
                - grayscale[((y - step) * width) + x]
                - grayscale[((y + step) * width) + x]
            );
            edgeSquareSum += laplacian * laplacian;
            edgeCount += 1;
        }
    }

    const mean = sum / Math.max(count, 1);
    const variance = (squareSum / Math.max(count, 1)) - (mean * mean);
    const contrast = Math.sqrt(Math.max(variance, 0));
    const edgeEnergy = edgeSquareSum / Math.max(edgeCount, 1);
    return {
        mean,
        contrast,
        edgeEnergy,
        acceptable: mean >= 32 && mean <= 254.5 && contrast >= 10 && edgeEnergy >= 2
    };
}

export function adaptiveThreshold(
    grayscale,
    width,
    height,
    { blockSize = DEFAULT_OPTIONS.adaptiveBlockSize, offset = DEFAULT_OPTIONS.adaptiveOffset } = {}
) {
    const integralWidth = width + 1;
    const integral = new Float64Array(integralWidth * (height + 1));
    for (let y = 0; y < height; y += 1) {
        let rowSum = 0;
        for (let x = 0; x < width; x += 1) {
            rowSum += grayscale[(y * width) + x];
            integral[((y + 1) * integralWidth) + x + 1] = (
                integral[(y * integralWidth) + x + 1] + rowSum
            );
        }
    }

    const half = Math.max(2, Math.floor(blockSize / 2));
    const binary = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
        const top = Math.max(0, y - half);
        const bottom = Math.min(height - 1, y + half);
        for (let x = 0; x < width; x += 1) {
            const left = Math.max(0, x - half);
            const right = Math.min(width - 1, x + half);
            const area = (right - left + 1) * (bottom - top + 1);
            const localSum = (
                integral[((bottom + 1) * integralWidth) + right + 1]
                - integral[(top * integralWidth) + right + 1]
                - integral[((bottom + 1) * integralWidth) + left]
                + integral[(top * integralWidth) + left]
            );
            binary[(y * width) + x] = grayscale[(y * width) + x] < (localSum / area) - offset
                ? 1
                : 0;
        }
    }
    return binary;
}

function bestComponentInRegion(binary, width, height, region) {
    const left = Math.max(0, Math.floor(region.left * width));
    const right = Math.min(width - 1, Math.ceil(region.right * width));
    const top = Math.max(0, Math.floor(region.top * height));
    const bottom = Math.min(height - 1, Math.ceil(region.bottom * height));
    const regionWidth = right - left + 1;
    const regionHeight = bottom - top + 1;
    const visited = new Uint8Array(regionWidth * regionHeight);
    const stack = new Int32Array(regionWidth * regionHeight);
    const minimumSide = Math.max(10, Math.floor(Math.min(width, height) * 0.01));
    let best = null;

    for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
            const localIndex = ((y - top) * regionWidth) + (x - left);
            if (visited[localIndex] || binary[(y * width) + x] === 0) continue;

            let stackSize = 1;
            stack[0] = localIndex;
            visited[localIndex] = 1;
            let area = 0;
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;

            while (stackSize > 0) {
                stackSize -= 1;
                const current = stack[stackSize];
                const currentX = (current % regionWidth) + left;
                const currentY = Math.floor(current / regionWidth) + top;
                area += 1;
                minX = Math.min(minX, currentX);
                maxX = Math.max(maxX, currentX);
                minY = Math.min(minY, currentY);
                maxY = Math.max(maxY, currentY);

                const neighbors = [current - 1, current + 1, current - regionWidth, current + regionWidth];
                for (const neighbor of neighbors) {
                    if (neighbor < 0 || neighbor >= visited.length || visited[neighbor]) continue;
                    const neighborLocalX = neighbor % regionWidth;
                    const currentLocalX = current % regionWidth;
                    if (Math.abs(neighborLocalX - currentLocalX) > 1) continue;
                    const neighborX = neighborLocalX + left;
                    const neighborY = Math.floor(neighbor / regionWidth) + top;
                    if (neighborX > right || neighborY > bottom) continue;
                    visited[neighbor] = 1;
                    if (binary[(neighborY * width) + neighborX] === 1) {
                        stack[stackSize] = neighbor;
                        stackSize += 1;
                    }
                }
            }

            const componentWidth = maxX - minX + 1;
            const componentHeight = maxY - minY + 1;
            const aspect = componentWidth / componentHeight;
            const fillRatio = area / (componentWidth * componentHeight);
            const touchesImageEdge = (
                minX <= 1
                || minY <= 1
                || maxX >= width - 2
                || maxY >= height - 2
            );
            if (
                touchesImageEdge
                ||
                componentWidth < minimumSide
                || componentHeight < minimumSide
                || aspect < 0.62
                || aspect > 1.62
                || fillRatio < 0.56
            ) continue;

            const score = area * fillRatio;
            if (!best || score > best.score) {
                best = {
                    centerX: (minX + maxX) / 2,
                    centerY: (minY + maxY) / 2,
                    width: componentWidth,
                    height: componentHeight,
                    area,
                    fillRatio,
                    score
                };
            }
        }
    }
    return best;
}

export function findCornerMarkers(binary, width, height) {
    const regions = [
        { left: 0, right: 0.24, top: 0, bottom: 0.20 },
        { left: 0.76, right: 1, top: 0, bottom: 0.20 },
        { left: 0.76, right: 1, top: 0.80, bottom: 1 },
        { left: 0, right: 0.24, top: 0.80, bottom: 1 }
    ];
    const markers = regions.map((region) => bestComponentInRegion(binary, width, height, region));
    if (markers.some((marker) => !marker)) {
        throw new AnswerSheetReadError('MARKERS_NOT_FOUND', 'mantenha os quatro marcadores visíveis.');
    }
    return markers;
}

function solveLinearSystem(matrix, values) {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index]]);
    for (let column = 0; column < size; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < size; row += 1) {
            if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
        }
        if (Math.abs(augmented[pivot][column]) < 1e-10) {
            throw new AnswerSheetReadError('PERSPECTIVE_FAILED', 'evite um ângulo muito fechado.');
        }
        [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
        const divisor = augmented[column][column];
        for (let index = column; index <= size; index += 1) augmented[column][index] /= divisor;
        for (let row = 0; row < size; row += 1) {
            if (row === column) continue;
            const factor = augmented[row][column];
            for (let index = column; index <= size; index += 1) {
                augmented[row][index] -= factor * augmented[column][index];
            }
        }
    }
    return augmented.map((row) => row[size]);
}

export function calculateHomography(fromPoints, toPoints) {
    if (fromPoints.length !== 4 || toPoints.length !== 4) {
        throw new TypeError('A homografia exige quatro pontos de origem e destino.');
    }
    const matrix = [];
    const values = [];
    for (let index = 0; index < 4; index += 1) {
        const { x, y } = fromPoints[index];
        const { x: targetX, y: targetY } = toPoints[index];
        matrix.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y]);
        values.push(targetX);
        matrix.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y]);
        values.push(targetY);
    }
    return [...solveLinearSystem(matrix, values), 1];
}

export function applyHomography(matrix, x, y) {
    const divisor = (matrix[6] * x) + (matrix[7] * y) + matrix[8];
    return {
        x: ((matrix[0] * x) + (matrix[1] * y) + matrix[2]) / divisor,
        y: ((matrix[3] * x) + (matrix[4] * y) + matrix[5]) / divisor
    };
}

export function warpPerspective(imageData, detectedMarkers, geometry) {
    const canonicalPoints = geometry.markers.map((marker) => ({
        x: marker.centerX,
        y: marker.centerY
    }));
    const detectedPoints = detectedMarkers.map((marker) => ({
        x: marker.centerX,
        y: marker.centerY
    }));
    const inverse = calculateHomography(canonicalPoints, detectedPoints);
    const { width, height } = geometry.page;
    const output = new Uint8ClampedArray(width * height * 4);
    output.fill(255);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const source = applyHomography(inverse, x, y);
            const sourceX = Math.round(source.x);
            const sourceY = Math.round(source.y);
            if (
                sourceX < 0
                || sourceX >= imageData.width
                || sourceY < 0
                || sourceY >= imageData.height
            ) continue;
            const sourceOffset = ((sourceY * imageData.width) + sourceX) * 4;
            const targetOffset = ((y * width) + x) * 4;
            output[targetOffset] = imageData.data[sourceOffset];
            output[targetOffset + 1] = imageData.data[sourceOffset + 1];
            output[targetOffset + 2] = imageData.data[sourceOffset + 2];
            output[targetOffset + 3] = 255;
        }
    }
    return { data: output, width, height };
}

function darkRatio(binary, width, height, bubble, radiusFactor) {
    const radius = bubble.radius * radiusFactor;
    const radiusSquared = radius * radius;
    let dark = 0;
    let total = 0;
    for (let y = Math.floor(bubble.y - radius); y <= Math.ceil(bubble.y + radius); y += 1) {
        if (y < 0 || y >= height) continue;
        for (let x = Math.floor(bubble.x - radius); x <= Math.ceil(bubble.x + radius); x += 1) {
            if (x < 0 || x >= width) continue;
            if (((x - bubble.x) ** 2) + ((y - bubble.y) ** 2) > radiusSquared) continue;
            dark += binary[(y * width) + x];
            total += 1;
        }
    }
    return total ? dark / total : 0;
}

export function readAnswerBubbles(binary, geometry, questions, options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    return geometry.rows.map((row, rowIndex) => {
        const ratios = row.bubbles.map((bubble) => darkRatio(
            binary,
            geometry.page.width,
            geometry.page.height,
            bubble,
            config.samplingRadiusFactor
        ));
        const ranked = ratios
            .map((ratio, index) => ({ ratio, index }))
            .sort((left, right) => right.ratio - left.ratio);
        const strong = ranked.filter(({ ratio }) => ratio >= config.markedThreshold);
        let status = 'ambiguous';
        let selectedIndex = null;
        if (strong.length === 1 && (strong[0].ratio - (ranked[1]?.ratio || 0)) >= config.winnerMargin) {
            status = 'marked';
            selectedIndex = strong[0].index;
        } else if (strong.length === 0 && (ranked[0]?.ratio || 0) < config.blankThreshold) {
            status = 'blank';
        }
        return {
            questionId: questions[rowIndex].questionId,
            status,
            selectedIndex,
            ratios
        };
    });
}

export function recognizeAnswerSheet(imageData, questions, options = {}) {
    assertImageData(imageData);
    if (!Array.isArray(questions)) throw new TypeError('Questões inválidas.');
    const alternativeCounts = questions.map((question) => question.alternatives?.length || 0);
    const geometry = getAnswerSheetGeometry(alternativeCounts);
    const grayscale = rgbaToGrayscale(imageData);
    const quality = assessImageQuality(grayscale, imageData.width, imageData.height);
    if (!quality.acceptable) {
        throw new AnswerSheetReadError('LOW_QUALITY', 'use boa luz, foco e evite sombras.');
    }
    const binary = adaptiveThreshold(grayscale, imageData.width, imageData.height, options);
    const markers = findCornerMarkers(binary, imageData.width, imageData.height);
    const alignedImageData = warpPerspective(imageData, markers, geometry);
    const alignedGrayscale = rgbaToGrayscale(alignedImageData);
    const alignedBinary = adaptiveThreshold(
        alignedGrayscale,
        alignedImageData.width,
        alignedImageData.height,
        options
    );
    return {
        alignedImageData,
        markers,
        quality,
        geometry,
        questions: readAnswerBubbles(alignedBinary, geometry, questions, options)
    };
}
