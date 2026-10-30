
const repository = require('../repositories/applicationVersionsRepository');
const { ApiError } = require('../http/ApiError');

async function getAnswerKey(versionId, teacherId) {
  const id = Number(versionId);
  const ownerId = Number(teacherId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'ID da versão inválido.');
  }

  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Professor não identificado.');
  }

  const rows = await repository.findAnswerKey(id, ownerId);

  if (rows.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Versão não encontrada.');
  }

  const questionsMap = new Map();

  for (const row of rows) {
    if (row.questionId == null) continue;

    if (!questionsMap.has(row.questionId)) {
      questionsMap.set(row.questionId, {
        questionId: row.questionId,
        order: row.questionOrder,
        correctAlternative: null,
      });
    }

    if (Number(row.isCorrect) === 1) {
      questionsMap.get(row.questionId).correctAlternative =
        String.fromCharCode(64 + Number(row.alternativeOrder));
    }
  }

  return {
    versionId: rows[0].versionId,
    versionNumber: rows[0].versionNumber,
    applicationId: rows[0].applicationId,
    examTitle: rows[0].examTitle,
    questions: [...questionsMap.values()].sort(
      (a, b) => a.order - b.order
    ),
  };
}

async function generateVersions(applicationId, teacherId, body) {
  const id = Number(applicationId);
  const ownerId = Number(teacherId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'ID da aplicação inválido.');
  }

  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Professor não identificado.');
  }

  const configs = body?.versoes;

  if (!Array.isArray(configs) || configs.length < 1 || configs.length > 50) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Informe entre 1 e 50 versões.'
    );
  }

  for (const config of configs) {
    if (
      typeof config.embaralharQuestoes !== 'boolean' ||
      typeof config.embaralharAlternativas !== 'boolean' ||
      typeof config.identificacao !== 'boolean'
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'As configurações das versões são inválidas.'
      );
    }
  }

  try {
    return await repository.generateVersions(id, ownerId, configs);
  } catch (error) {
    if (error.statusCode === 404) {
      throw new ApiError(404, 'NOT_FOUND', error.message);
    }

    if (error.statusCode === 400) {
      throw new ApiError(400, 'VALIDATION_ERROR', error.message);
    }

    if (error.statusCode === 409) {
      throw new ApiError(409, 'CONFLICT', error.message);
    }

    throw error;
  }
}

async function listVersions(applicationId, teacherId) {
  const id = Number(applicationId);
  const ownerId = Number(teacherId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'ID da aplicação inválido.'
    );
  }

  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new ApiError(
      401,
      'UNAUTHORIZED',
      'Professor não identificado.'
    );
  }

  return repository.listVersions(id, ownerId);
}

async function listAssignments(applicationId, teacherId) {
  const id = Number(applicationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'ID da aplicação inválido.');
  }

  return repository.listAssignments(id, Number(teacherId));
}

module.exports = {
  getAnswerKey,
  generateVersions,
  listVersions,
  listAssignments,
};
