const { pool } = require('../config/database');

const findProfessorCredentialsByEmail = async (email, db = pool) => {
    const [rows] = await db.execute(
        `SELECT id,
                full_name AS fullName,
                email,
                password_hash AS passwordHash,
                is_active AS isActive
         FROM professors
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
};

const createSession = async ({ professorId, tokenHash, sessionTtlSeconds }, db = pool) => {
    await db.execute(
        `INSERT INTO auth_sessions (professor_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? SECOND))`,
        [professorId, tokenHash, sessionTtlSeconds]
    );
};

const findProfessorBySessionHash = async (tokenHash, db = pool) => {
    const [rows] = await db.execute(
        `SELECT professor.id,
                professor.full_name AS fullName,
                professor.email
         FROM auth_sessions AS auth_session
         INNER JOIN professors AS professor
             ON professor.id = auth_session.professor_id
         WHERE auth_session.token_hash = ?
           AND auth_session.expires_at > CURRENT_TIMESTAMP(3)
           AND professor.is_active = TRUE
         LIMIT 1`,
        [tokenHash]
    );

    return rows[0] || null;
};

const deleteSession = async (tokenHash, db = pool) => {
    await db.execute('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
};

const deleteExpiredSessions = async (db = pool) => {
    await db.execute('DELETE FROM auth_sessions WHERE expires_at <= CURRENT_TIMESTAMP(3)');
};

module.exports = {
    findProfessorCredentialsByEmail,
    createSession,
    findProfessorBySessionHash,
    deleteSession,
    deleteExpiredSessions
};
