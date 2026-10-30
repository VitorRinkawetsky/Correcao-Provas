const mysql = require('mysql2/promise');

// Bancos gerenciados na nuvem exigem TLS. DB_SSL_CA aceita o certificado PEM
// com quebras de linha escritas como \n (formato de variável de ambiente).
const buildSslOptions = () => {
    if (process.env.DB_SSL !== 'true') return undefined;

    const ca = process.env.DB_SSL_CA
        ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
        : undefined;

    return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
};

const pool = mysql.createPool({
    ssl: buildSslOptions(),
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || 'sgp',
    password: process.env.DB_PASSWORD || 'sgp_dev',
    database: process.env.DB_NAME || 'correcao_provas',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    decimalNumbers: true,
    timezone: 'Z'
});

const checkDatabaseConnection = async () => {
    const connection = await pool.getConnection();

    try {
        await connection.ping();
    } finally {
        connection.release();
    }
};

const closeDatabaseConnection = () => pool.end();

// Executa fn dentro de uma transação; faz rollback se der erro.
const createTransactionRunner = (databasePool) => async (fn) => {
    const connection = await databasePool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await fn(connection);
        await connection.commit();
        return result;
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Falha no rollback:', rollbackError.message);
        }
        throw error;
    } finally {
        connection.release();
    }
};

const withTransaction = createTransactionRunner(pool);

module.exports = {
    pool,
    checkDatabaseConnection,
    closeDatabaseConnection,
    createTransactionRunner,
    withTransaction
};
