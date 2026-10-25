
const service = require('../services/applicationsService');

async function create(request, response, next) {
    try {
        const application = await service.create(
            request.teacher.id,
            request.body
        );

        return response.status(201).json({
            data: application,
            meta: {}
        });
    } catch (error) {
        return next(error);
    }
}

async function getById(request, response, next) {
    try {
        const application = await service.getById(
            request.teacher.id,
            request.params.id
        );

        return response.json({
            data: application,
            meta: {}
        });
    } catch (error) {
        return next(error);
    }
}

async function list(request, response, next) {
    try {
        const applications = await service.list(request.teacher.id);

        return response.json({
            data: applications,
            meta: { total: applications.length }
        });
    } catch (error) {
        return next(error);
    }
}


module.exports = { create, getById, list };
