const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const repository = require('../repositories/applicationVersionsRepository');
const {
    ANSWER_SHEET_LAYOUT: L,
    QUESTIONS_PER_SHEET,
    bubbleCenter
} = require('./answerSheetLayout');

const PT = 72 / 25.4;
const mm = (value) => value * PT;
const font = (file) => path.join(__dirname, '../assets/fonts', file);
const letterOf = (order) => L.grid.letters[order - 1];

async function buildVersionPdf(versionId, teacherId) {
    const data = await repository.findPrintData(versionId, teacherId);

    if (!data) {
        const error = new Error('Versão não encontrada.');
        error.statusCode = 404;
        throw error;
    }

    if (data.questions.length === 0) {
        const error = new Error('A versão não possui questões.');
        error.statusCode = 400;
        throw error;
    }

    // Texto do QR = EXATAMENTE o payload gravado no banco.
    const sheets = data.assignments.length > 0
        ? data.assignments.map((a) => ({
            student: { name: a.studentName, registration: a.registration },
            payload: a.qrCodePayload
        }))
        : [{ student: null, payload: data.head.qrCodePayload }];

    await Promise.all(sheets.map(async (sheet) => {
        sheet.qr = await QRCode.toBuffer(sheet.payload, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 600
        });
    }));

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    doc.registerFont('r', font('Roboto-Regular.ttf'));
    doc.registerFont('b', font('Roboto-Bold.ttf'));

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    drawExam(doc, data);
    for (const sheet of sheets) {
        drawAnswerSheets(doc, data, sheet);
    }

    doc.end();
    return finished;
}

/* ---------- Folha de questões ---------- */
function drawExam(doc, data) {
    const { head, questions } = data;
    const left = L.margin;
    const width = L.page.width - 2 * L.margin;
    const bottom = L.page.height - L.margin;
    const date = new Date(head.applicationDate || Date.now()).toLocaleDateString('pt-BR');
    let y = L.margin;

    const newPage = (first) => {
        doc.addPage();
        y = L.margin;
        doc.font('b').fontSize(first ? 15 : 10).fillColor('#000')
            .text(head.examTitle, mm(left), mm(y), { width: mm(width) });
        y += first ? 8 : 5;
        doc.font('r').fontSize(10).text(
            `Turma: ${head.className}    Data: ${date}    Versão ${head.versionNumber}`,
            mm(left), mm(y), { width: mm(width) }
        );
        y += 7;

        if (first) {
            doc.text(
                'Nome: ______________________________________________   Matrícula: ______________',
                mm(left), mm(y), { width: mm(width) }
            );
            y += 10;
        }
    };

    newPage(true);

    questions.forEach((question, index) => {
        const score = String(question.score).replace('.', ',');
        const statement = `${index + 1}. ${question.statement}  (${score} pt)`;

        doc.font('b').fontSize(10.5);
        const statementHeight = doc.heightOfString(statement, { width: mm(width) }) / PT;

        doc.font('r').fontSize(10);
        const alternativeHeights = question.alternatives.map((alt) =>
            doc.heightOfString(`${letterOf(alt.order)}) ${alt.text}`, { width: mm(width - 6) }) / PT + 1
        );

        const total = statementHeight + 1
            + alternativeHeights.reduce((sum, h) => sum + h, 0) + 4;

        // Não corta questão: se não couber inteira, começa na página seguinte.
        if (y + total > bottom) {
            newPage(false);
        }

        doc.font('b').fontSize(10.5)
            .text(statement, mm(left), mm(y), { width: mm(width) });
        y += statementHeight + 1;

        doc.font('r').fontSize(10);
        question.alternatives.forEach((alt, i) => {
            doc.text(`${letterOf(alt.order)}) ${alt.text}`, mm(left + 6), mm(y), { width: mm(width - 6) });
            y += alternativeHeights[i];
        });

        y += 4;
    });
}

/* ---------- Cartão-resposta (página separada, feita para leitura por câmera) ---------- */
function drawAnswerSheets(doc, data, sheet) {
    const { head, questions } = data;
    const pages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_SHEET));

    for (let p = 0; p < pages; p++) {
        doc.addPage();
        doc.fillColor('#000').strokeColor('#000');

        for (const marker of L.markers.positions) {
            doc.rect(mm(marker.x), mm(marker.y), mm(L.markers.size), mm(L.markers.size)).fill('#000');
        }

        doc.image(sheet.qr, mm(L.qr.x), mm(L.qr.y), { width: mm(L.qr.size), height: mm(L.qr.size) });

        const headerWidth = mm(L.header.width);
        let y = L.header.y;
        doc.fillColor('#000').font('b').fontSize(13)
            .text('CARTÃO-RESPOSTA', mm(L.header.x), mm(y), { width: headerWidth });
        y += 8;
        doc.font('r').fontSize(10);

        if (sheet.student) {
            doc.text(`Aluno: ${sheet.student.name}`, mm(L.header.x), mm(y), { width: headerWidth });
            y += 6;
            doc.text(`Matrícula: ${sheet.student.registration}`, mm(L.header.x), mm(y), { width: headerWidth });
            y += 6;
        }

        doc.text(
            `Versão ${head.versionNumber}${pages > 1 ? `  (cartão ${p + 1}/${pages})` : ''}`,
            mm(L.header.x), mm(y), { width: headerWidth }
        );
        y += 6;
        doc.fontSize(8).text('Preencha totalmente o círculo, a caneta preta.',
            mm(L.header.x), mm(y), { width: headerWidth });

        const slice = questions.slice(p * QUESTIONS_PER_SHEET, (p + 1) * QUESTIONS_PER_SHEET);

        slice.forEach((question, slot) => {
            const first = bubbleCenter(slot, 0);

            doc.font('r').fontSize(9).fillColor('#000').text(
                String(p * QUESTIONS_PER_SHEET + slot + 1),
                mm(first.x - L.grid.bubbleOffset - L.grid.numberWidth),
                mm(first.y - 1.6),
                { width: mm(L.grid.numberWidth - 2), align: 'right', lineBreak: false }
            );

            question.alternatives.forEach((alt, a) => {
                const c = bubbleCenter(slot, a);

                doc.font('r').fontSize(9).text(
                    letterOf(alt.order),
                    mm(c.x - L.grid.bubbleOffset),
                    mm(c.y - 1.6),
                    { width: mm(L.grid.letterWidth), lineBreak: false }
                );

                doc.circle(mm(c.x), mm(c.y), mm(L.grid.bubbleDiameter / 2))
                    .lineWidth(mm(L.grid.strokeWidth))
                    .stroke('#000');
            });
        });
    }
}

module.exports = { buildVersionPdf };