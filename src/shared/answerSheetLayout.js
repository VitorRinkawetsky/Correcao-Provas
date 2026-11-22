export const ANSWER_SHEET_LAYOUT = Object.freeze({
    page: Object.freeze({ width: 1000, height: 1414 }),
    marker: Object.freeze({ inset: 42, size: 54 }),
    qr: Object.freeze({ x: 110, y: 105, size: 210 }),
    grid: Object.freeze({
        questionNumberX: 250,
        firstBubbleX: 420,
        firstRowY: 330,
        columnGap: 105,
        rowGap: 46,
        bubbleRadius: 18,
        minQuestions: 1,
        maxQuestions: 20,
        minAlternatives: 2,
        maxAlternatives: 5
    })
});

function markerGeometry() {
    const { width, height } = ANSWER_SHEET_LAYOUT.page;
    const { inset, size } = ANSWER_SHEET_LAYOUT.marker;
    const positions = [
        [inset, inset],
        [width - inset - size, inset],
        [width - inset - size, height - inset - size],
        [inset, height - inset - size]
    ];

    return positions.map(([x, y]) => ({
        x,
        y,
        width: size,
        height: size,
        centerX: x + (size / 2),
        centerY: y + (size / 2)
    }));
}

export function getAnswerSheetGeometry(alternativeCounts) {
    const { grid } = ANSWER_SHEET_LAYOUT;
    if (
        !Array.isArray(alternativeCounts)
        || alternativeCounts.length < grid.minQuestions
        || alternativeCounts.length > grid.maxQuestions
    ) {
        throw new RangeError('O cartão deve ter entre 1 e 20 questões.');
    }

    alternativeCounts.forEach((count) => {
        if (
            !Number.isInteger(count)
            || count < grid.minAlternatives
            || count > grid.maxAlternatives
        ) {
            throw new RangeError('Cada questão deve ter entre 2 e 5 alternativas.');
        }
    });

    return {
        page: { ...ANSWER_SHEET_LAYOUT.page },
        markers: markerGeometry(),
        qr: { ...ANSWER_SHEET_LAYOUT.qr },
        rows: alternativeCounts.map((alternativeCount, rowIndex) => {
            const y = grid.firstRowY + (rowIndex * grid.rowGap);
            return {
                order: rowIndex + 1,
                y,
                questionNumberX: grid.questionNumberX,
                bubbles: Array.from({ length: alternativeCount }, (_, alternativeIndex) => ({
                    index: alternativeIndex,
                    letter: String.fromCharCode(65 + alternativeIndex),
                    x: grid.firstBubbleX + (alternativeIndex * grid.columnGap),
                    y,
                    radius: grid.bubbleRadius
                }))
            };
        })
    };
}
