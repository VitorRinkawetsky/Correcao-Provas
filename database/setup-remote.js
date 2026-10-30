// Aplica database/init.sql em um MySQL hospedado (Railway, Aiven, TiDB etc.).
// ATENCAO: o init.sql recria todas as tabelas e apaga os dados existentes.
//
// Uso: CONFIRM_RESET=sim npm run db:setup
// Lê as mesmas variáveis do servidor (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD,
// DB_NAME, DB_SSL, DB_SSL_CA), via .env ou ambiente.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// O init.sql usa a sintaxe DELIMITER do cliente mysql para os triggers; o driver
// não a entende, então o arquivo é dividido em comandos aqui.
const splitStatements = (sql) => {
    const statements = [];
    let delimiter = ';';
    let buffer = [];

    // CREATE DATABASE / USE são do ambiente local: removidos para que o schema
    // seja aplicado somente no banco de DB_NAME.
    const scopedSql = sql
        .replace(/^\s*CREATE\s+DATABASE\b[\s\S]*?;[ \t]*$/gim, '')
        .replace(/^\s*USE\s+[^;]+;[ \t]*$/gim, '');

    for (const line of scopedSql.split(/\r?\n/)) {
        const trimmed = line.trim();
        const delimiterMatch = trimmed.match(/^DELIMITER\s+(\S+)/i);

        if (delimiterMatch) {
            delimiter = delimiterMatch[1];
            continue;
        }

        buffer.push(line);

        if (trimmed.endsWith(delimiter)) {
            const statement = buffer.join('\n').trim();
            statements.push(statement.slice(0, statement.length - delimiter.length).trim());
            buffer = [];
        }
    }

    return statements.filter((statement) => statement.replace(/--.*$/gm, '').trim());
};

const run = async () => {
    if (process.env.CONFIRM_RESET !== 'sim') {
        console.error('Este comando recria todas as tabelas e apaga os dados do banco informado.');
        console.error('Para continuar, execute: CONFIRM_RESET=sim npm run db:setup');
        process.exit(1);
    }

    const ca = process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined;
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
            : undefined
    });

    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    const statements = splitStatements(sql);

    // Trava de segurança: nenhum comando pode trocar ou criar outro banco.
    if (statements.some((statement) => /^\s*(USE|CREATE\s+DATABASE)\b/im.test(statement))) {
        throw new Error('O script contém comandos que trocam de banco; execução cancelada.');
    }

    try {
        const [[current]] = await connection.query('SELECT DATABASE() AS name');
        if (!process.env.DB_NAME || current.name !== process.env.DB_NAME) {
            throw new Error(`Banco conectado (${current.name}) diferente de DB_NAME (${process.env.DB_NAME}).`);
        }

        for (const statement of statements) {
            await connection.query(statement);
        }
        console.log(`Schema aplicado em ${process.env.DB_NAME}: ${statements.length} comandos executados.`);
    } finally {
        await connection.end();
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error('Falha ao aplicar o schema:', error.message);
        process.exit(1);
    });
}

module.exports = { splitStatements };
