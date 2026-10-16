const express = require('express');
const controller = require('../controllers/questao.controller');
const requireTeacher = require('../middlewares/teacherContext');

const router = express.Router();

router.use(requireTeacher);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;