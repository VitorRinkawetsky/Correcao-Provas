const express = require('express');
const path = require('path');

const app = express();
const distPath = path.join(__dirname, '../dist');

app.use(express.json());
app.use(express.static(distPath));

app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) {
        next();
        return;
    }

    response.sendFile(path.join(distPath, 'index.html'));
});

module.exports = app;
