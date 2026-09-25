const mysql = require('mysql2/promise');

const pool = mysql.createPool({
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

module.exports = {
    pool,
    checkDatabaseConnection,
    closeDatabaseConnection
};
