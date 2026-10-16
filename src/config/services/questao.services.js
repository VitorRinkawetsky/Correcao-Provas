const { withTransaction } = require('../config/database');
const repo = require('../repositories/questao.repositories');
const AppError = require('../utils/AppError');

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Id inválido.');
    return id;
}

// Monta um objeto novo só com campos permitidos. Campos como teacherId,
// type/tipo e status enviados no body são ignorados de propósito.
function validatePayload(body) {
    const errors = [];
    const input = body && typeof body === 'object' ? body : {};

    const statement =
        typeof input.statement === 'string' ? input.statement.trim() : '';
    if (!statement) errors.push('O enunciado é obrigatório.');
    if (statement.length > 5000) errors.push('O enunciado excede 5000 caracteres.');

    let tags = [];
    if (input.tags !== undefined) {
        if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== 'string')) {
            errors.push('Tags deve ser uma lista de textos.');
        } else {
            tags = [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))];
            if (tags.length > 20) errors.push('Máximo de 20 tags.');
            if (tags.some((t) => t.length > 100)) {
                errors.push('Cada tag deve ter até 100 caracteres.');
            }
        }
    }

    let alternatives = [];
    const list = input.alternatives;

    if (!Array.isArray(list) || list.length < 2 || list.length > 5) {
        errors.push('A questão deve ter de 2 a 5 alternativas.');
    } else {
        alternatives = list.map((a) => ({
            text: a && typeof a.text === 'string' ? a.text.trim() : '',
            isCorrect: false
        }));

        if (alternatives.some((a) => !a.text)) {
            errors.push('Nenhuma alternativa pode ter texto vazio.');
        }
        if (alternatives.some((a) => a.text.length > 1000)) {
            errors.push('Cada alternativa deve ter até 1000 caracteres.');
        }

        // Contrato atual do Vue: correctAlternativeIndex.
        // Também aceita isCorrect em cada alternativa.
        let correctIndex = input.correctAlternativeIndex;
        if (!Number.isInteger(correctIndex)) {
            const flagged = list
                .map((a, i) => (a?.isCorrect === true ? i : -1))
                .filter((i) => i >= 0);
            correctIndex = flagged.length === 1 ? flagged[0] : -1;
        }

        if (correctIndex < 0 || correctIndex >= alternatives.length) {
            errors.push('Marque exatamente uma alternativa correta.');
        } else {
            alternatives[correctIndex].isCorrect = true;
        }
    }

    if (errors.length) throw new AppError(400, 'Dados inválidos.', errors);
    return { statement, tags, alternatives };
}

function parseFilters(query) {
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const tags =
        typeof query.tags === 'string'
            ? query.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];
    return { search, tags };
}

async function writeChildren(db, questionId, data) {
    await repo.replaceAlternatives(db, questionId, data.alternatives);
    await repo.replaceTags(db, questionId, data.tags);
}

async function list(teacherId, query) {
    return repo.list(teacherId, parseFilters(query));
}

async function get(teacherId, idParam) {
    const question = await repo.findById(teacherId, parseId(idParam));
    if (!question) throw new AppError(404, 'Questão não encontrada.');
    return question;
}

async function create(teacherId, body) {
    const data = validatePayload(body);

    const id = await withTransaction(async (db) => {
        const questionId = await repo.insertQuestion(db, teacherId, data.statement);
        await writeChildren(db, questionId, data);
        return questionId;
    });

    return repo.findById(teacherId, id);
}

async function update(teacherId, idParam, body) {
    const id = parseId(idParam);
    const data = validatePayload(body);

    const result = await withTransaction(async (db) => {
        if (!(await repo.lockOwned(db, teacherId, id))) {
            throw new AppError(404, 'Questão não encontrada.');
        }

        if (await repo.isUsedInExam(db, id)) {
            // Já usada em prova: a versão antiga é arquivada (continua ligada
            // às provas) e a edição cria uma nova questão.
            await repo.archive(db, teacherId, id);
            const newId = await repo.insertQuestion(db, teacherId, data.statement);
            await writeChildren(db, newId, data);
            return { id: newId, newVersion: true };
        }

        await repo.updateStatement(db, teacherId, id, data.statement);
        await writeChildren(db, id, data);
        return { id, newVersion: false };
    });

    const question = await repo.findById(teacherId, result.id);
    return { ...question, newVersion: result.newVersion };
}

async function remove(teacherId, idParam) {
    const id = parseId(idParam);

    return withTransaction(async (db) => {
        if (!(await repo.lockOwned(db, teacherId, id))) {
            throw new AppError(404, 'Questão não encontrada.');
        }

        if (await repo.isUsedInExam(db, id)) {
            await repo.archive(db, teacherId, id);
            return { status: 'archived', id, archived: true };
        }

        await repo.remove(db, teacherId, id);
        return { status: 'deleted', id, archived: false };
    });
}

module.exports = { list, get, create, update, remove };