require('dotenv').config();

const app = require('./app');
const { checkDatabaseConnection, closeDatabaseConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await checkDatabaseConnection();

        const server = app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
            console.log('Conexão com o MySQL estabelecida');
        });

        const shutdown = (signal) => {
            console.log(`${signal} recebido. Encerrando servidor...`);

            server.close(async () => {
                await closeDatabaseConnection();
                process.exit(0);
            });
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error) {
        console.error('Não foi possível iniciar o servidor:', error.message);
        await closeDatabaseConnection();
        process.exit(1);
    }
};

startServer();
