const { pool } = require('../database');

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

async function buscarTags(db, ids) {
    const mapa = new Map(ids.map((id) => [id, []]));
    if (ids.length === 0) return mapa;

    const [rows] = await db.query(
        'SELECT questao_id, tag FROM questao_tags WHERE questao_id IN (?) ORDER BY tag',
        [ids]
    );
    rows.forEach((r) => mapa.get(r.questao_id).push(r.tag));
    return mapa;
}

async function listar(teacherId, { texto, tipo, tags = [] }) {
    const params = [teacherId];
    const where = ['q.teacher_id = ?', 'q.arquivada_em IS NULL'];

    if (texto) {
        where.push("q.enunciado LIKE ?");
        params.push(`%${escapeLike(texto)}%`);
    }
    if (tipo) {
        where.push('q.tipo = ?');
        params.push(tipo);
    }
    // Cada tag digitada precisa casar (parcialmente) com alguma tag da questão
    for (const tag of tags) {
        where.push(
            'EXISTS (SELECT 1 FROM questao_tags t WHERE t.questao_id = q.id AND t.tag LIKE ?)'
        );
        params.push(`%${escapeLike(tag)}%`);
    }

    const [questoes] = await pool.query(
        `SELECT q.id, q.enunciado, q.tipo, q.criada_em
           FROM questoes q
          WHERE ${where.join(' AND ')}
          ORDER BY q.criada_em DESC, q.id DESC`,
        params
    );

    const mapaTags = await buscarTags(pool, questoes.map((q) => q.id));
    return questoes.map((q) => ({ ...q, tags: mapaTags.get(q.id) }));
}

async function buscarPorId(teacherId, id, db = pool) {
    const [rows] = await db.query(
        `SELECT id, enunciado, tipo, criada_em
           FROM questoes
          WHERE id = ? AND teacher_id = ? AND arquivada_em IS NULL`,
        [id, teacherId]
    );
    if (rows.length === 0) return null;

    const [alternativas] = await db.query(
        'SELECT id, texto, correta FROM alternativas WHERE questao_id = ? ORDER BY ordem',
        [id]
    );
    const mapaTags = await buscarTags(db, [id]);

    return {
        ...rows[0],
        tags: mapaTags.get(id),
        // "correta" é necessário para a tela de edição
        alternativas: alternativas.map((a) => ({
            id: a.id,
            texto: a.texto,
            correta: Boolean(a.correta)
        }))
    };
}

// Trava a linha dentro da transação (evita editar/excluir em paralelo)
async function bloquear(db, teacherId, id) {
    const [rows] = await db.query(
        `SELECT id FROM questoes
          WHERE id = ? AND teacher_id = ? AND arquivada_em IS NULL
          FOR UPDATE`,
        [id, teacherId]
    );
    return rows[0] || null;
}

async function foiUsada(db, id) {
    const [rows] = await db.query(
        'SELECT 1 FROM prova_questoes WHERE questao_id = ? LIMIT 1',
        [id]
    );
    return rows.length > 0;
}

async function inserir(db, teacherId, dados, versaoAnteriorId = null) {
    const [resultado] = await db.query(
        `INSERT INTO questoes (teacher_id, enunciado, tipo, versao_anterior_id)
         VALUES (?, ?, ?, ?)`,
        [teacherId, dados.enunciado, dados.tipo, versaoAnteriorId]
    );
    return resultado.insertId;
}

async function inserirAlternativas(db, questaoId, alternativas) {
    if (alternativas.length === 0) return;
    const valores = alternativas.map((a, i) => [
        questaoId,
        a.texto,
        a.correta ? 1 : 0,
        i + 1
    ]);
    await db.query(
        'INSERT INTO alternativas (questao_id, texto, correta, ordem) VALUES ?',
        [valores]
    );
}

async function inserirTags(db, questaoId, tags) {
    if (tags.length === 0) return;
    await db.query(
        'INSERT INTO questao_tags (questao_id, tag) VALUES ?',
        [tags.map((tag) => [questaoId, tag])]
    );
}

async function atualizar(db, id, dados) {
    await db.query(
        'UPDATE questoes SET enunciado = ?, tipo = ? WHERE id = ?',
        [dados.enunciado, dados.tipo, id]
    );
}

async function removerAlternativas(db, questaoId) {
    await db.query('DELETE FROM alternativas WHERE questao_id = ?', [questaoId]);
}

async function removerTags(db, questaoId) {
    await db.query('DELETE FROM questao_tags WHERE questao_id = ?', [questaoId]);
}

async function arquivar(db, id) {
    await db.query(
        'UPDATE questoes SET arquivada_em = UTC_TIMESTAMP() WHERE id = ?',
        [id]
    );
}

async function excluir(db, id) {
    await db.query('DELETE FROM questoes WHERE id = ?', [id]);
}

module.exports = {
    listar,
    buscarPorId,
    bloquear,
    foiUsada,
    inserir,
    inserirAlternativas,
    inserirTags,
    atualizar,
    removerAlternativas,
    removerTags,
    arquivar,
    excluir
};