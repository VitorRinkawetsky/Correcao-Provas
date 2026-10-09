const service = require('../services/questao.services');

function tratarErro(err, res) {
  if (err instanceof service.AppError) {
    return res
      .status(err.status)
      .json({ erro: err.message, detalhes: err.detalhes });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

const handler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    tratarErro(err, res);
  }
};

module.exports = {
  listar: handler(async (req, res) => {
    res.json(await service.listar(req.teacherId, req.query));
  }),

  obter: handler(async (req, res) => {
    res.json(await service.obter(req.teacherId, req.params.id));
  }),

  criar: handler(async (req, res) => {
    res.status(201).json(await service.criar(req.teacherId, req.body));
  }),

  atualizar: handler(async (req, res) => {
    res.json(await service.atualizar(req.teacherId, req.params.id, req.body));
  }),

  excluir: handler(async (req, res) => {
    res.json(await service.excluir(req.teacherId, req.params.id));
  }),
};