const express = require('express');
const path = require('path');

const { pool } = require('./config/database');

const app = express();
const distPath = path.join(__dirname, '../dist');

app.use(express.json());

app.get('/api/health', async (_request, response) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS database_name, CURRENT_TIMESTAMP AS checked_at'
        );

        response.json({
            status: 'ok',
            database: rows[0].database_name,
            checkedAt: rows[0].checked_at
        });
    } catch (error) {
        console.error('Falha ao consultar o banco de dados:', error.message);
        response.status(503).json({
            status: 'error',
            message: 'Banco de dados indisponível'
        });
    }
});

app.use('/api', (_request, response) => {
    response.status(404).json({
        status: 'error',
        message: 'Endpoint não encontrado'
    });
});

app.use(express.static(distPath));

app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) {
        next();
        return;
    }

    response.sendFile(path.join(distPath, 'index.html'));
});

module.exports = app;
