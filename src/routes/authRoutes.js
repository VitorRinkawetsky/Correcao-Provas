const { Router } = require('express');

const controller = require('../controllers/authController');
const { handleApiError } = require('../http/ApiError');
const requireTeacherSession = require('../middlewares/requireTeacherSession');
const loginRateLimit = require('../middlewares/loginRateLimit');

const router = Router();

router.post('/register', controller.register);
router.post('/login', loginRateLimit, controller.login);
router.get('/me', requireTeacherSession, controller.me);
router.post('/logout', controller.logout);
router.use(handleApiError);

module.exports = router;
