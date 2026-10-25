const { withTransaction } = require('../config/database');
const repository = require('../repositories/questionsRepository');
const { ApiError } = require('../http/ApiError');

const MIN_ALTERNATIVES = 2;
const MAX_ALTERNATIVES = 5;
const MAX_STATEMENT = 5000;
const MAX_ALTERNATIVE = 1000;
const MAX_TAGS = 20;
const MAX_TAG = 80;

const validationError = (details) => new ApiError(
    400, 'VALIDATION_ERROR', 'Dados invalidos para salvar a questao', details
);

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Questao nao encontrada');

const parseId = (value) => {
    const id = Number(value);
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(id) || id < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Identificador invalido', [{ field: 'id' }]);
    }
    return id;
};

const normalizeTags = (value, details) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
        details.push({ field: 'tags', message: 'As tags devem ser uma lista de textos' });
        return [];
    }

    const seen = new Set();
    const tags = value.map((tag) => tag.trim()).filter((tag) => {
        const key = tag.toLocaleLowerCase('pt-BR');
        if (!tag || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (tags.length > MAX_TAGS) {
        details.push({ field: 'tags', message: `Informe no maximo ${MAX_TAGS} tags` });
    }
    if (tags.some((tag) => tag.length > MAX_TAG)) {
        details.push({ field: 'tags', message: `Cada tag deve ter ate ${MAX_TAG} caracteres` });
    }

    return tags;
};

const correctIndexOf = (body, rawAlternatives) => {
    // Contrato do questionStore.js: correctAlternativeIndex.
    if (body.correctAlternativeIndex !== undefined) return body.correctAlternativeIndex;

    const flagged = rawAlternatives
        .map((alternative, index) => (alternative?.isCorrect === true ? index : -1))
        .filter((index) => index >= 0);
    return flagged.length === 1 ? flagged[0] : -1;
};

// Monta um objeto novo apenas com campos permitidos: teacherId, type e status
// enviados no corpo sao ignorados. O professor vem sempre do contexto autenticado.
const validatePayload = (body) => {
    const input = body && typeof body === 'object' ? body : {};
    const details = [];

    const statement = typeof input.statement === 'string' ? input.statement.trim() : '';
    if (!statement) {
        details.push({ field: 'statement', message: 'Informe o enunciado da questao' });
    } else if (statement.length > MAX_STATEMENT) {
        details.push({ field: 'statement', message: `O enunciado deve ter ate ${MAX_STATEMENT} caracteres` });
    }

    const tags = normalizeTags(input.tags, details);

    const raw = input.alternatives;
    let alternatives = [];

    if (!Array.isArray(raw) || raw.length < MIN_ALTERNATIVES || raw.length > MAX_ALTERNATIVES) {
        details.push({
            field: 'alternatives',
            message: `A questao deve ter entre ${MIN_ALTERNATIVES} e ${MAX_ALTERNATIVES} alternativas`
        });
    } else {
        alternatives = raw.map((alternative) => ({
            text: typeof alternative?.text === 'string' ? alternative.text.trim() : '',
            isCorrect: false
        }));

        if (alternatives.some((alternative) => !alternative.text)) {
            details.push({ field: 'alternatives', message: 'Preencha o texto de todas as alternativas' });
        }
        if (alternatives.some((alternative) => alternative.text.length > MAX_ALTERNATIVE)) {
            details.push({
                field: 'alternatives',
                message: `Cada alternativa deve ter ate ${MAX_ALTERNATIVE} caracteres`
            });
        }

        const correctIndex = correctIndexOf(input, raw);
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= alternatives.length) {
            details.push({
                field: 'correctAlternativeIndex',
                message: 'Selecione exatamente uma alternativa correta'
            });
        } else {
            alternatives[correctIndex].isCorrect = true;
        }
    }

    if (details.length > 0) throw validationError(details);

    return { statement, tags, alternatives };
};

const parseFilters = (query = {}) => ({
    search: typeof query.search === 'string' ? query.search.trim() : '',
    tags: typeof query.tags === 'string'
        ? query.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []
});

const writeContent = async (questionId, data, db) => {
    await repository.replaceAlternatives(questionId, data.alternatives, db);
    await repository.replaceTags(questionId, data.tags, db);
};

const list = (teacherId, query) => repository.findAll(teacherId, parseFilters(query));

const get = async (teacherId, idParam) => {
    const question = await repository.findById(teacherId, parseId(idParam));
    if (!question) throw notFound();
    return question;
};

const create = async (teacherId, body) => {
    const data = validatePayload(body);

    const id = await withTransaction(async (db) => {
        const questionId = await repository.insertQuestion(teacherId, data.statement, db);
        await writeContent(questionId, data, db);
        return questionId;
    });

    return repository.findById(teacherId, id);
};

const update = async (teacherId, idParam, body) => {
    const id = parseId(idParam);
    const data = validatePayload(body);

    const result = await withTransaction(async (db) => {
        if (!(await repository.lockActiveOwned(teacherId, id, db))) throw notFound();

        if (await repository.hasHistory(id, db)) {
            // Ja usada em prova, versao ou correcao: a versao antiga e arquivada e
            // continua ligada ao historico; a edicao gera uma nova questao.
            await repository.archiveQuestion(teacherId, id, db);
            const newId = await repository.insertQuestion(teacherId, data.statement, db);
            await writeContent(newId, data, db);
            return { id: newId, newVersion: true };
        }

        await repository.updateStatement(teacherId, id, data.statement, db);
        await writeContent(id, data, db);
        return { id, newVersion: false };
    });

    const question = await repository.findById(teacherId, result.id);
    return { ...question, newVersion: result.newVersion };
};

const remove = async (teacherId, idParam) => {
    const id = parseId(idParam);

    return withTransaction(async (db) => {
        if (!(await repository.lockActiveOwned(teacherId, id, db))) throw notFound();

        if (await repository.hasHistory(id, db)) {
            await repository.archiveQuestion(teacherId, id, db);
            return { status: 'archived', id, archived: true };
        }

        await repository.deleteQuestion(teacherId, id, db);
        return { status: 'deleted', id, archived: false };
    });
};

module.exports = { list, get, create, update, remove, validatePayload };