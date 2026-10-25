
const express = require('express');
const path = require('path');
const applicationsRoutes = require('./routes/applicationsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const authRoutes = require('./routes/authRoutes');
const correctionsRoutes = require('./routes/correctionsRoutes');
const requireTeacherSession = require('./middlewares/requireTeacherSession');
const { TRUST_PROXY_HOPS } = require('./config/proxy');


const { checkDatabaseConnection } = require('./config/database');
const examsRoutes = require('./routes/examsRoutes');
const questionsRoutes = require('./routes/questionsRoutes');
const { handleApiError } = require('./http/ApiError');

const classesRoutes = require('./routes/classesRoutes');
const applicationVersionsRoutes = require('./routes/applicationVersionsRoutes');


const app = express();

if (TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', TRUST_PROXY_HOPS);
}

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

app.use('/api/auth', authRoutes);
app.use('/api', requireTeacherSession);

app.use('/api/exams', examsRoutes);
app.use('/api/application-versions', applicationVersionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/reports', reportsRoutes);

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
