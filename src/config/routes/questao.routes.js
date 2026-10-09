const express = require('express');
const controller = require('../controllers/questao.controller');

const router = express.Router();

// O professor vem SEMPRE da sessão/token, nunca do corpo da requisição.
// Troque por (ou coloque antes) o middleware de autenticação do projeto,
// que deve preencher req.user.id.
function exigirProfessor(req, res, next) {
  let id = req.user?.id;

  // Atalho só para desenvolvimento local; nunca ativo em produção.
  if (!id && process.env.NODE_ENV !== 'production') {
    id = Number(req.get('X-Dev-Teacher-Id')) || undefined;
  }

  if (!id) return res.status(401).json({ erro: 'Não autenticado.' });
  req.teacherId = id;
  next();
}

router.use(exigirProfessor);

router.get('/', controller.listar);
router.get('/:id', controller.obter);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);

module.exports = router;