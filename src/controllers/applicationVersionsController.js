
const service = require('../services/applicationVersionsService');

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

module.exports = {
    getAnswerKey,
    generate,
    list
};
