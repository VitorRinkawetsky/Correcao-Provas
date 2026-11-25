const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const repository = require('../repositories/applicationVersionsRepository');
const { ApiError } = require('../http/ApiError');

const PT = 72 / 25.4;
const mm = (value) => value * PT;
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const PAGE = { width: 210, height: 297 };
const MARGIN = 15;
const letterOf = (order) => String.fromCharCode(64 + Number(order));

// O cartão usa o MESMO layout do leitor automático (src/shared/answerSheetLayout.mjs).
// O arquivo é ESM porque também é usado no navegador; por isso o import dinâmico.
const loadAnswerSheetLayout = () => import('../shared/answerSheetLayout.mjs');

async function buildVersionPdf(versionId, teacherId) {
    const data = await repository.findPrintData(versionId, teacherId);

    if (!data) {
        throw new ApiError(404, 'NOT_FOUND', 'Versao nao encontrada');
    }

    if (data.questions.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'A versao nao possui questoes');
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

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    const { getAnswerSheetGeometry } = await loadAnswerSheetLayout();

    drawExam(doc, data);
    for (const sheet of sheets) {
        drawAnswerSheet(doc, data, sheet, getAnswerSheetGeometry);
    }

    doc.end();
    return finished;
}

/* ---------- Folha de questões ---------- */
function drawExam(doc, data) {
    const { head, questions } = data;
    const left = MARGIN;
    const width = PAGE.width - 2 * MARGIN;
    const bottom = PAGE.height - MARGIN;
    const date = new Date(head.applicationDate || Date.now()).toLocaleDateString('pt-BR');
    let y = MARGIN;

    const newPage = (first) => {
        doc.addPage();
        y = MARGIN;
        doc.font(FONT_BOLD).fontSize(first ? 15 : 10).fillColor('#000')
            .text(head.examTitle, mm(left), mm(y), { width: mm(width) });
        y += first ? 8 : 5;
        doc.font(FONT_REGULAR).fontSize(10).text(
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

        doc.font(FONT_BOLD).fontSize(10.5);
        const statementHeight = doc.heightOfString(statement, { width: mm(width) }) / PT;

        doc.font(FONT_REGULAR).fontSize(10);
        const alternativeHeights = question.alternatives.map((alt) =>
            doc.heightOfString(`${letterOf(alt.order)}) ${alt.text}`, { width: mm(width - 6) }) / PT + 1
        );

        const total = statementHeight + 1
            + alternativeHeights.reduce((sum, h) => sum + h, 0) + 4;

        // Não corta questão: se não couber inteira, começa na página seguinte.
        if (y + total > bottom) {
            newPage(false);
        }

        doc.font(FONT_BOLD).fontSize(10.5)
            .text(statement, mm(left), mm(y), { width: mm(width) });
        y += statementHeight + 1;

        doc.font(FONT_REGULAR).fontSize(10);
        question.alternatives.forEach((alt, i) => {
            doc.text(`${letterOf(alt.order)}) ${alt.text}`, mm(left + 6), mm(y), { width: mm(width - 6) });
            y += alternativeHeights[i];
        });

        y += 4;
    });
}

/* ---------- Cartão-resposta (página separada, no layout lido pela câmera) ---------- */
function drawAnswerSheet(doc, data, sheet, getAnswerSheetGeometry) {
    const { head, questions } = data;
    const geometry = getAnswerSheetGeometry(
        questions.map((question) => question.alternatives.length)
    );
    // O layout é desenhado em uma página de 1000 x 1414 unidades (proporção A4).
    const unit = mm(PAGE.width) / geometry.page.width;
    const u = (value) => value * unit;
    // Em SVG o y do texto é a linha de base; no pdfkit é o topo da linha.
    const textTop = (baseline, size) => u(baseline - (size * 0.8));

    doc.addPage();
    doc.fillColor('#000').strokeColor('#000');

    for (const marker of geometry.markers) {
        doc.rect(u(marker.x), u(marker.y), u(marker.width), u(marker.height)).fill('#000');
    }

    doc.image(sheet.qr, u(geometry.qr.x), u(geometry.qr.y), {
        width: u(geometry.qr.size),
        height: u(geometry.qr.size)
    });

    const identity = sheet.student
        ? `${sheet.student.name} · Matrícula ${sheet.student.registration}`
        : 'Prova sem identificação do aluno';
    const headerWidth = u(geometry.page.width - 360 - 110);

    doc.fillColor('#000').font(FONT_BOLD).fontSize(u(30))
        .text(head.examTitle, u(360), textTop(145, 30), { width: headerWidth, lineBreak: false, ellipsis: true });
    doc.font(FONT_REGULAR).fontSize(u(23))
        .text(`Versão ${head.versionNumber}`, u(360), textTop(190, 23), { width: headerWidth, lineBreak: false });
    doc.fontSize(u(23))
        .text(identity, u(360), textTop(230, 23), { width: headerWidth, lineBreak: false, ellipsis: true });
    doc.fontSize(u(18))
        .text('Preencha completamente um círculo por questão.', u(360), textTop(280, 18), {
            width: headerWidth,
            lineBreak: false
        });

    const widestRow = geometry.rows.reduce(
        (largest, row) => (row.bubbles.length > largest.bubbles.length ? row : largest),
        geometry.rows[0]
    );
    const letterBox = u(40);
    doc.font(FONT_BOLD).fontSize(u(20));
    for (const bubble of widestRow.bubbles) {
        doc.text(bubble.letter, u(bubble.x) - letterBox / 2, textTop(296, 20), {
            width: letterBox,
            align: 'center',
            lineBreak: false
        });
    }

    const numberBox = u(80);
    geometry.rows.forEach((row) => {
        doc.font(FONT_BOLD).fontSize(u(24)).fillColor('#000')
            .text(`${row.order}.`, u(row.questionNumberX) - numberBox, textTop(row.y + 8, 24), {
                width: numberBox,
                align: 'right',
                lineBreak: false
            });

        for (const bubble of row.bubbles) {
            doc.circle(u(bubble.x), u(bubble.y), u(bubble.radius))
                .lineWidth(u(3))
                .stroke('#000');
        }
    });

    const footerWidth = u(800);
    doc.font(FONT_REGULAR).fontSize(u(17)).fillColor('#000')
        .text('Não dobre o cartão e mantenha os quatro quadrados visíveis.',
            u(500) - footerWidth / 2, textTop(1270, 17), {
                width: footerWidth,
                align: 'center',
                lineBreak: false
            });
}

module.exports = { buildVersionPdf };