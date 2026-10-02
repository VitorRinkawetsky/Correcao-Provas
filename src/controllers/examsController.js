const examsService = require('../services/examsService');
const questionsRepository = require('../repositories/questionsRepository');

const success = (response, data, status = 200) => response.status(status).json({
    data,
    meta: Array.isArray(data) ? { total: data.length } : {}
});

module.exports = {
    list: async (request, response) => success(response, await examsService.list(request.teacher.id)),
    details: async (request, response) => success(response, await examsService.details(request.params.id, request.teacher.id)),
    create: async (request, response) => {
        const data = await examsService.create(request.teacher.id, request.body);
        response.location(`/api/exams/${data.id}`);
        return success(response, data, 201);
    },
    update: async (request, response) => success(
        response,
        await examsService.update(request.params.id, request.teacher.id, request.body)
    ),
    questions: async (request, response) => success(
        response,
        await questionsRepository.listQuestions(request.teacher.id)
    )
};
