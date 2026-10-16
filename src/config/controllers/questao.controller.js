const service = require('../services/questao.service');

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);

module.exports = {
    list: asyncHandler(async (req, res) => {
        res.json(await service.list(req.teacherId, req.query));
    }),
    get: asyncHandler(async (req, res) => {
        res.json(await service.get(req.teacherId, req.params.id));
    }),
    create: asyncHandler(async (req, res) => {
        res.status(201).json(await service.create(req.teacherId, req.body));
    }),
    update: asyncHandler(async (req, res) => {
        res.json(await service.update(req.teacherId, req.params.id, req.body));
    }),
    remove: asyncHandler(async (req, res) => {
        res.json(await service.remove(req.teacherId, req.params.id));
    })
};