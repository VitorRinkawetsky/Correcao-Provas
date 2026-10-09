const { withTransaction } = require('../database');
const repo = require('../repositories/questao.repositories');

class AppError extends Error {
    constructor(status, mensagem, detalhes) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
    }
}

const TIPOS = ['Objetiva', 'Discursiva'];

function validarId(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Id inválido.');
    return id;
}

// Monta um objeto novo só com campos permitidos.
// teacherId do corpo da requisição é ignorado de propósito.
function validarEntrada(body) {
    const erros = [];
    const b = body && typeof body === 'object' ? body : {};

    const enunciado = typeof b.enunciado === 'string' ? b.enunciado.trim() : '';
    if (!enunciado) erros.push('O enunciado é obrigatório.');
    if (enunciado.length > 5000) erros.push('O enunciado excede 5000 caracteres.');

    const tipo = b.tipo;
    if (!TIPOS.includes(tipo)) erros.push('Tipo deve ser Objetiva ou Discursiva.');

    let tags = [];
    if (b.tags !== undefined) {
        if (!Array.isArray(b.tags) || b.tags.some((t) => typeof t !== 'string')) {
            erros.push('Tags deve ser uma lista de textos.');
        } else {
            tags = [...new Set(b.tags.map((t) => t.trim()).filter(Boolean))];
            if (tags.length > 20) erros.push('Máximo de 20 tags.');
            if (tags.some((t) => t.length > 100)) erros.push('Cada tag deve ter até 100 caracteres.');
        }
    }

    let alternativas = [];
    if (tipo === 'Objetiva') {
        const lista = b.alternativas;
        if (!Array.isArray(lista) || lista.length < 2 || lista.length > 5) {
            erros.push('Questões objetivas devem ter de 2 a 5 alternativas.');
        } else {
            alternativas = lista.map((a) => ({
                texto: a && typeof a.texto === 'string' ? a.texto.trim() : '',
                correta: a?.correta === true
            }));
            if (alternativas.some((a) => !a.texto)) {
                erros.push('Nenhuma alternativa pode ter texto vazio.');
            }
            if (alternativas.some((a) => a.texto.length > 1000)) {
                erros.push('Cada alternativa deve ter até 1000 caracteres.');
            }
            if (alternativas.filter((a) => a.correta).length !== 1) {
                erros.push('Marque exatamente uma alternativa correta.');
            }
        }
    } else if (tipo === 'Discursiva' && Array.isArray(b.alternativas) && b.alternativas.length) {
        erros.push('Questões discursivas não possuem alternativas.');
    }

    if (erros.length) throw new AppError(400, 'Dados inválidos.', erros);
    return { enunciado, tipo, tags, alternativas };
}

function parseFiltros(query) {
    const texto = typeof query.texto === 'string' ? query.texto.trim() : '';
    const tipo = typeof query.tipo === 'string' ? query.tipo : '';
    if (tipo && !TIPOS.includes(tipo)) throw new AppError(400, 'Tipo inválido.');
    const tags =
        typeof query.tags === 'string'
            ? query.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];
    return { texto, tipo, tags };
}

async function gravarFilhos(db, questaoId, dados) {
    await repo.inserirAlternativas(db, questaoId, dados.alternativas);
    await repo.inserirTags(db, questaoId, dados.tags);
}

async function listar(teacherId, query) {
    return repo.listar(teacherId, parseFiltros(query));
}

async function obter(teacherId, idParam) {
    const questao = await repo.buscarPorId(teacherId, validarId(idParam));
    if (!questao) throw new AppError(404, 'Questão não encontrada.');
    return questao;
}

async function criar(teacherId, body) {
    const dados = validarEntrada(body);
    const id = await withTransaction(async (db) => {
        const novoId = await repo.inserir(db, teacherId, dados);
        await gravarFilhos(db, novoId, dados);
        return novoId;
    });
    return repo.buscarPorId(teacherId, id);
}

async function atualizar(teacherId, idParam, body) {
    const id = validarId(idParam);
    const dados = validarEntrada(body);

    const resultado = await withTransaction(async (db) => {
        if (!(await repo.bloquear(db, teacherId, id))) {
            throw new AppError(404, 'Questão não encontrada.');
        }

        if (await repo.foiUsada(db, id)) {
            // Já usada em prova: arquiva a versão antiga (continua ligada
            // às provas) e a edição vira uma nova versão.
            await repo.arquivar(db, id);
            const novoId = await repo.inserir(db, teacherId, dados, id);
            await gravarFilhos(db, novoId, dados);
            return { id: novoId, novaVersao: true };
        }

        await repo.atualizar(db, id, dados);
        await repo.removerAlternativas(db, id);
        await repo.removerTags(db, id);
        await gravarFilhos(db, id, dados);
        return { id, novaVersao: false };
    });

    const questao = await repo.buscarPorId(teacherId, resultado.id);
    return { ...questao, novaVersao: resultado.novaVersao };
}

async function excluir(teacherId, idParam) {
    const id = validarId(idParam);

    return withTransaction(async (db) => {
        if (!(await repo.bloquear(db, teacherId, id))) {
            throw new AppError(404, 'Questão não encontrada.');
        }
        if (await repo.foiUsada(db, id)) {
            await repo.arquivar(db, id); // preserva provas já aplicadas
            return { id, arquivada: true };
        }
        await repo.excluir(db, id);
        return { id, arquivada: false };
    });
}

module.exports = { AppError, listar, obter, criar, atualizar, excluir };