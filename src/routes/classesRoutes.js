const { Router } = require('express');
const controller = require('../controllers/classesController');
const classTeacherContext = require('../middlewares/classTeacherContext');
const { handleApiError } = require('../http/ApiError');

const router = Router();
router.use(classTeacherContext);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.details);
router.put('/:id', controller.update);
router.delete('/:id', controller.archive);
router.post('/:id/invite-code', controller.regenerateInvite);
router.get('/:id/students', controller.students);
router.post('/:id/students', controller.addStudent);
router.delete('/:id/students/:studentId', controller.removeStudent);
router.get('/:id/students/:studentId/grades', controller.grades);
router.use(handleApiError);

module.exports = router;
