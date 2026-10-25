const defaultService = require('../services/correctionsService');

function success(response, data) {
    return response.json({
        data,
        meta: Array.isArray(data) ? { total: data.length } : {}
    });
}

function createCorrectionsController(service = defaultService) {
    return {
        listCorrections: async (request, response, next) => {
            try {
                const data = await service.listCorrections(
                    request.teacher.id,
                    {
                        applicationId: request.query.applicationId,
                        search: request.query.search
                    }
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        },

        getFormOptions: async (request, response, next) => {
            try {
                const data = await service.getFormOptions(
                    request.teacher.id,
                    request.params.applicationId
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        },

        getVersionQuestions: async (request, response, next) => {
            try {
                const data = await service.getVersionQuestions(
                    request.teacher.id,
                    request.params.versionId
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        },

        createCorrection: async (request, response, next) => {
            try {
                const data = await service.createCorrection(
                    request.teacher.id,
                    request.body
                );
                return response.status(201).json({ data, meta: {} });
            } catch (error) {
                return next(error);
            }
        },

        listPending: async (request, response, next) => {
            try {
                const data = await service.listPending(
                    request.teacher.id,
                    request.params.applicationId
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        },

        listStudents: async (request, response, next) => {
            try {
                const data = await service.listStudents(
                    request.teacher.id,
                    request.params.applicationId
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        },

        associateStudent: async (request, response, next) => {
            try {
                const data = await service.associateStudent(
                    request.teacher.id,
                    request.params.correctionId,
                    request.body
                );
                return success(response, data);
            } catch (error) {
                return next(error);
            }
        }
    };
}

const controller = createCorrectionsController();

module.exports = { ...controller, createCorrectionsController };
