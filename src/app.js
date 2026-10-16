const express = require('express');
const path = require('path');

const { checkDatabaseConnection } = require('./config/database');
const questionsRouter = require('./routes/questions.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.get('/api/health', async (_request, response) => {
    try {
        await checkDatabaseConnection();

        response.json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        console.error('Falha no health check:', error.message);

        response.status(500).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

app.use('/api/questions', questionsRouter);

app.use('/api', (_request, response) => {
    response.status(404).json({
        status: 'error',
        message: 'Rota da API não encontrada.'
    });
});

app.use('/api', errorHandler);

const distPath = path.join(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.get('*splat', (_request, response) => {
    response.sendFile(path.join(distPath, 'index.html'));
});

module.exports = app;