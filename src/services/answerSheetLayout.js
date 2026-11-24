// Medidas em mm. Origem: canto superior esquerdo. A4 em pé.
// Usado pelo gerador do PDF E pelo leitor automático.
const ANSWER_SHEET_LAYOUT = Object.freeze({
    version: 1,
    page: { width: 210, height: 297 },
    margin: 15,
    markers: {
        size: 10,
        positions: [
            { id: 'TL', x: 15, y: 15 },
            { id: 'TR', x: 185, y: 15 },
            { id: 'BL', x: 15, y: 272 },
            { id: 'BR', x: 185, y: 272 }
        ]
    },
    qr: { x: 150, y: 30, size: 45 },
    header: { x: 30, y: 32, width: 115 },
    grid: {
        y: 85,
        rowPitch: 8,
        rowsPerColumn: 22,
        columns: [{ x: 20 }, { x: 110 }],
        numberWidth: 10,
        colPitch: 14,
        letterWidth: 4,
        bubbleOffset: 7,
        bubbleDiameter: 6,
        strokeWidth: 0.4,
        maxAlternatives: 5,
        letters: 'ABCDE'
    }
});

const QUESTIONS_PER_SHEET =
    ANSWER_SHEET_LAYOUT.grid.rowsPerColumn * ANSWER_SHEET_LAYOUT.grid.columns.length;

// slot = índice da questão dentro da página do cartão (0..43); alt = 0..4 (A..E)
function bubbleCenter(slot, alt) {
    const g = ANSWER_SHEET_LAYOUT.grid;
    const col = Math.floor(slot / g.rowsPerColumn);
    const row = slot % g.rowsPerColumn;

    return {
        x: g.columns[col].x + g.numberWidth + alt * g.colPitch + g.bubbleOffset,
        y: g.y + row * g.rowPitch + g.rowPitch / 2
    };
}

module.exports = { ANSWER_SHEET_LAYOUT, QUESTIONS_PER_SHEET, bubbleCenter };