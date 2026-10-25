const { pool } = require('../config/database');

const findByEmail = async (email, db = pool) => {
    const [rows] = await db.execute(
        `SELECT id, full_name AS fullName, email
         FROM professors
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
};

const insert = async ({ fullName, email, passwordHash }, db = pool) => {
    const [result] = await db.execute(
        `INSERT INTO professors (full_name, email, password_hash)
         VALUES (?, ?, ?)`,
        [fullName, email, passwordHash]
    );

    return Number(result.insertId);
};

module.exports = { findByEmail, insert };
