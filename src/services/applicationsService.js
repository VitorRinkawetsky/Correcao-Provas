
const { pool } = require('../config/database');
const repository = require('../repositories/applicationsRepository');
const { ApiError } = require('../http/ApiError');

function positiveId(value, field) {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Identificador inválido',
      [{ field }]
    );
  }

  return Number(value);
}

async function create(teacherId, body) {
  const ownerId = positiveId(teacherId, 'teacherId');
  const examId = positiveId(body?.examId, 'examId');
  const classId = positiveId(body?.classId, 'classId');

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const exam = await repository.findOwnedExam(
      examId,
      ownerId,
      connection
    );

    if (!exam) {
      throw new ApiError(404, 'NOT_FOUND', 'Prova não encontrada.');
    }

    if (exam.status === 'archived' || exam.status === 'closed') {
      throw new ApiError(
        409,
        'EXAM_LOCKED',
        'Provas arquivadas ou fechadas não podem receber aplicações.'
      );
    }

    if (Number(exam.questionCount) === 0) {
      throw new ApiError(
        409,
        'EXAM_WITHOUT_QUESTIONS',
        'A prova não possui questões.'
      );
    }

    const classItem = await repository.findOwnedClass(
      classId,
      ownerId,
      connection
    );

    if (!classItem) {
      throw new ApiError(404, 'NOT_FOUND', 'Turma não encontrada.');
    }

    const studentsCount = await repository.countActiveStudents(classId, connection);
    if (studentsCount === 0) {
      throw new ApiError(
        409,
        'CLASS_WITHOUT_STUDENTS',
        'A turma não possui alunos matriculados.'
      );
    }

    const applicationId = await repository.insertApplication(
      { examId, classId, teacherId: ownerId },
      connection
    );

    const application = await repository.findApplication(
      applicationId,
      ownerId,
      connection
    );

    await connection.commit();
    return application;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


async function getById(teacherId, applicationId) {
  const ownerId = positiveId(teacherId, 'teacherId');
  const id = positiveId(applicationId, 'applicationId');

  const application = await repository.findApplication(id, ownerId);

  if (!application) {
    throw new ApiError(
      404,
      'NOT_FOUND',
      'Aplicação não encontrada.'
    );
  }

  return application;
}

async function list(teacherId) {
  const ownerId = positiveId(teacherId, 'teacherId');
  return repository.listApplications(ownerId);
}

module.exports = { create, getById, list };

