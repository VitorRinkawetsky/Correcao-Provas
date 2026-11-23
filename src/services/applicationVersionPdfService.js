import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'node:path';
import { ANSWER_SHEET_LAYOUT as L, QUESTIONS_PER_SHEET, bubbleCenter } from './answerSheetLayout.js';
import repo from '../repositories/applicationVersionsRepository.js';

const PT = 72 / 25.4;
const mm = (v) => v * PT;
const FONT = (f) => path.resolve('src/assets/fonts', f);

export async function buildVersionPdf(versionId, teacherId) {
  const data = await repo.findPrintData(versionId, teacherId);
  if (!data) throw Object.assign(new Error('Versão não encontrada'), { status: 404 });

  // QR: texto EXATAMENTE igual ao payload do banco
  const sheets = data.head.with_student_identification
    ? data.assignments.map((a) => ({ student: a, payload: a.qr_code_payload }))
    : [{ student: null, payload: data.head.qr_code_payload }];
  await Promise.all(sheets.map(async (s) => {
    s.qr = await QRCode.toBuffer(s.payload, { errorCorrectionLevel: 'M', margin: 2, width: 600 });
  }));

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.registerFont('r', FONT('Roboto-Regular.ttf'));
  doc.registerFont('b', FONT('Roboto-Bold.ttf'));
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((res) => doc.on('end', () => res(Buffer.concat(chunks))));

  drawExam(doc, data);
  for (const s of sheets) drawAnswerSheets(doc, data, s);

  doc.end();
  return done;
}

/* ---------- Folha de questões ---------- */
function drawExam(doc, data) {
  const { head, questions } = data;
  const left = L.margin, width = L.page.width - 2 * L.margin, bottom = L.page.height - L.margin;
  let y;

  const newPage = (first) => {
    doc.addPage();
    y = L.margin;
    doc.font('b').fontSize(first ? 15 : 10).fillColor('#000')
       .text(head.exam_title, mm(left), mm(y), { width: mm(width) });
    y += first ? 8 : 5;
    doc.font('r').fontSize(10).text(
      `Turma: ${head.class_name}    Data: ${new Date(head.application_date).toLocaleDateString('pt-BR')}    Versão ${head.version_number}`,
      mm(left), mm(y), { width: mm(width) });
    y += 7;
    if (first) {
      doc.text('Nome: ______________________________________________   Matrícula: ______________',
        mm(left), mm(y), { width: mm(width) });
      y += 10;
    }
  };

  newPage(true);
  questions.forEach((q, i) => {
    const stmt = `${i + 1}. ${q.statement}  (${Number(q.score).toString().replace('.', ',')} pt)`;
    doc.font('b').fontSize(10.5);
    let h = doc.heightOfString(stmt, { width: mm(width) }) / PT;
    doc.font('r').fontSize(10);
    const altH = q.alternatives.map((a) =>
      doc.heightOfString(`${a.printedLetter}) ${a.text}`, { width: mm(width - 6) }) / PT + 1);
    h += altH.reduce((s, v) => s + v, 0) + 5;

    if (y + h > bottom) newPage(false);       // não corta questão: vai inteira para a próxima página

    doc.font('b').fontSize(10.5).text(stmt, mm(left), mm(y), { width: mm(width) });
    y += doc.heightOfString(stmt, { width: mm(width) }) / PT + 1;
    doc.font('r').fontSize(10);
    q.alternatives.forEach((a, k) => {
      doc.text(`${a.printedLetter}) ${a.text}`, mm(left + 6), mm(y), { width: mm(width - 6) });
      y += altH[k];
    });
    y += 4;
  });
}

/* ---------- Cartão-resposta ---------- */
function drawAnswerSheets(doc, data, sheet) {
  const { head, questions } = data;
  const pages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_SHEET));

  for (let p = 0; p < pages; p++) {
    doc.addPage();
    doc.fillColor('#000').strokeColor('#000');

    // 4 marcadores
    for (const m of L.markers.positions)
      doc.rect(mm(m.x), mm(m.y), mm(L.markers.size), mm(L.markers.size)).fill('#000');

    // QR
    doc.image(sheet.qr, mm(L.qr.x), mm(L.qr.y), { width: mm(L.qr.size), height: mm(L.qr.size) });

    // Cabeçalho (fora da grade)
    let y = L.header.y;
    const w = mm(L.header.width);
    doc.font('b').fontSize(13).text('CARTÃO-RESPOSTA', mm(L.header.x), mm(y), { width: w }); y += 8;
    doc.font('r').fontSize(10);
    if (sheet.student) {
      doc.text(`Aluno: ${sheet.student.full_name}`, mm(L.header.x), mm(y), { width: w }); y += 6;
      doc.text(`Matrícula: ${sheet.student.registration}`, mm(L.header.x), mm(y), { width: w }); y += 6;
    }
    doc.text(`Versão ${head.version_number}${pages > 1 ? `  (cartão ${p + 1}/${pages})` : ''}`,
      mm(L.header.x), mm(y), { width: w }); y += 6;
    doc.fontSize(8).text('Preencha totalmente o círculo, a caneta preta.', mm(L.header.x), mm(y), { width: w });

    // Grade
    const slice = questions.slice(p * QUESTIONS_PER_SHEET, (p + 1) * QUESTIONS_PER_SHEET);
    slice.forEach((q, slot) => {
      const c0 = bubbleCenter(slot, 0);
      doc.font('r').fontSize(9).fillColor('#000')
         .text(String(p * QUESTIONS_PER_SHEET + slot + 1),
               mm(c0.x - L.grid.bubbleOffset - L.grid.numberWidth), mm(c0.y - 1.6),
               { width: mm(L.grid.numberWidth - 2), align: 'right', lineBreak: false });
      for (let a = 0; a < q.alternatives.length; a++) {   // só até o nº de alternativas (2 a 5)
        const c = bubbleCenter(slot, a);
        doc.font('r').fontSize(9)
           .text(L.grid.letters[a], mm(c.x - L.grid.bubbleOffset), mm(c.y - 1.6),
                 { width: mm(L.grid.letterWidth), align: 'left', lineBreak: false });
        doc.circle(mm(c.x), mm(c.y), mm(L.grid.bubbleDiameter / 2))
           .lineWidth(mm(L.grid.strokeWidth)).stroke('#000');
      }
    });
  }
}