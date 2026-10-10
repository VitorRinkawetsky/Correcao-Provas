const service = require('../services/classesService');

const success = (response, data, status = 200) => response.status(status).json({
    data, meta: Array.isArray(data) ? { total: data.length } : {}
});

module.exports = {
    list: async (req, res) => success(res, await service.list(req.teacher.id, req.query.status)),
    details: async (req, res) => success(res, await service.details(req.params.id, req.teacher.id)),
    create: async (req, res) => {
        const data = await service.create(req.teacher.id, req.body);
        res.location(`/api/classes/${data.id}`);
        return success(res, data, 201);
    },
    update: async (req, res) => success(res, await service.update(req.params.id, req.teacher.id, req.body)),
    archive: async (req, res) => {
        await service.archive(req.params.id, req.teacher.id);
        res.status(204).send();
    },
    regenerateInvite: async (req, res) => success(res, await service.regenerateInvite(req.params.id, req.teacher.id)),
    students: async (req, res) => success(res, await service.students(req.params.id, req.teacher.id)),
    addStudent: async (req, res) => success(res, await service.addStudent(req.params.id, req.teacher.id, req.body), 201),
    removeStudent: async (req, res) => {
        await service.removeStudent(req.params.id, req.teacher.id, req.params.studentId);
        res.status(204).send();
    },
    grades: async (req, res) => success(res, await service.grades(req.params.id, req.teacher.id, req.params.studentId))
};
