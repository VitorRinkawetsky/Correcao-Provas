
const express = require('express');
const path = require('path');

const { checkDatabaseConnection } = require('./config/database');
const { TRUST_PROXY_HOPS } = require('./config/proxy');

const authRoutes = require('./routes/authRoutes');
const requireTeacherSession = require('./middlewares/requireTeacherSession');

const examsRoutes = require('./routes/examsRoutes');
const applicationsRoutes = require('./routes/applicationsRoutes');
const applicationVersionsRoutes = require('./routes/applicationVersionsRoutes');
const correctionsRoutes = require('./routes/correctionsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const questionsRoutes = require('./routes/questionsRoutes');
const classesRoutes = require('./routes/classesRoutes');

const { handleApiError } = require('./http/ApiError');

const app = express();

if (TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', TRUST_PROXY_HOPS);
}

app.use(express.json());

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| AUTENTICAÇÃO
|--------------------------------------------------------------------------
*/

// As rotas de autenticação precisam ficar antes da proteção de sessão.
app.use('/api/auth', authRoutes);

/*
|--------------------------------------------------------------------------
| PROTEÇÃO DAS ROTAS
|--------------------------------------------------------------------------
*/

app.use('/api', requireTeacherSession);

/*
|--------------------------------------------------------------------------
| ROTAS DA API
|--------------------------------------------------------------------------
*/

app.use('/api/exams', examsRoutes);
app.use('/api/application-versions', applicationVersionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/classes', classesRoutes);

/*
|--------------------------------------------------------------------------
| TRATAMENTO DE ERROS DA API
|--------------------------------------------------------------------------
*/

app.use('/api', handleApiError);

/*
|--------------------------------------------------------------------------
| API 404
|--------------------------------------------------------------------------
*/

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
