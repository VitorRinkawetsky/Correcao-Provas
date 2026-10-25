const service = require('../services/questionsService');

// Contrato do questionStore.js: listas e objetos sem envelope { data }.
module.exports = {
    list: async (request, response) => response.json(
        await service.list(request.teacher.id, request.query)
    ),
    get: async (request, response) => response.json(
        await service.get(request.teacher.id, request.params.id)
    ),
    create: async (request, response) => {
        const question = await service.create(request.teacher.id, request.body);
        response.location(`/api/questions/${question.id}`);
        return response.status(201).json(question);
    },
    update: async (request, response) => response.json(
        await service.update(request.teacher.id, request.params.id, request.body)
    ),
    remove: async (request, response) => response.json(
        await service.remove(request.teacher.id, request.params.id)
    )
};