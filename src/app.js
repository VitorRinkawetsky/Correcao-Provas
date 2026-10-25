const express = require('express');
const path = require('path');


const { checkDatabaseConnection } = require('./config/database');
const examsRoutes = require('./routes/examsRoutes');
const questionsRoutes = require('./routes/questionsRoutes');
const { handleApiError } = require('./http/ApiError');

const classesRoutes = require('./routes/classesRoutes');


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

app.use('/api/exams', examsRoutes);

// Rotas de questões (substitui os endpoints inline que existiam neste arquivo)
app.use('/api/questions', questionsRoutes);

// Rotas de turmas
app.use('/api/classes', classesRoutes);

/*
|--------------------------------------------------------------------------
| API 404
|--------------------------------------------------------------------------
*/

app.use('/api', handleApiError);

app.use('/api', (_request, response) => {
    response.status(404).json({
        status: 'error',
        message: 'Rota da API não encontrada.'
    });
});

/*
|--------------------------------------------------------------------------
| ARQUIVOS DO FRONT-END
|--------------------------------------------------------------------------
*/

const distPath = path.join(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.get('*splat', (_request, response) => {
    response.sendFile(
        path.join(distPath, 'index.html')
    );
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = app;