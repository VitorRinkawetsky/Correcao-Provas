
const service = require('../services/applicationVersionsService');
const { buildVersionPdf } = require('../services/applicationVersionPdfService');

async function getAnswerKey(request, response, next) {
    try {
        const result = await service.getAnswerKey(
            request.params.versionId,
            request.teacher?.id
        );

        return response.json({ data: result, meta: {} });
    } catch (error) {
        return next(error);
    }
}

async function generate(request, response, next) {
    try {
        const versions = await service.generateVersions(
            request.params.applicationId,
            request.teacher?.id,
            request.body
        );

        return response.status(201).json({
            data: versions,
            meta: { total: versions.length }
        });
    } catch (error) {
        return next(error);
    }
}

async function list(request, response, next) {
    try {
        const versions = await service.listVersions(
            request.params.applicationId,
            request.teacher?.id
        );

        return response.json({
            data: versions,
            meta: { total: versions.length }
        });
    } catch (error) {
        return next(error);
    }
}

async function listAssignments(request, response, next) {
    try {
        const assignments = await service.listAssignments(
            request.params.applicationId,
            request.teacher?.id
        );

        return response.json({
            data: assignments,
            meta: { total: assignments.length }
        });
    } catch (error) {
        return next(error);
    }
}

async function downloadPdf(request, response, next) {
    try {
        const versionId = Number(request.params.versionId);

        if (!Number.isSafeInteger(versionId) || versionId < 1) {
            const error = new Error('Identificador de versão inválido.');
            error.statusCode = 400;
            throw error;
        }

        const pdf = await buildVersionPdf(versionId, request.teacher?.id);

        response.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="prova-versao-${versionId}.pdf"`,
            'Content-Length': pdf.length
        });

        return response.send(pdf);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getAnswerKey,
    generate,
    list,
    listAssignments,
    downloadPdf
};
