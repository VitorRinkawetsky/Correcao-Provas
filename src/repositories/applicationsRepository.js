
const { pool } = require('../config/database');

async function findOwnedExam(examId, teacherId, db = pool) {
  const [rows] = await db.execute(
    `SELECT id, title
     FROM exams
     WHERE id = ? AND teacher_id = ?`,
    [examId, teacherId]
  );

  return rows[0] ?? null;
}

async function findOwnedClass(classId, teacherId, db = pool) {
  const [rows] = await db.execute(
    `SELECT id, name
     FROM classes
     WHERE id = ? AND teacher_id = ? AND status = 'active'`,
    [classId, teacherId]
  );

  return rows[0] ?? null;
}

async function insertApplication({ examId, classId, teacherId }, db = pool) {
  const [result] = await db.execute(
    `INSERT INTO applications (exam_id, class_id, teacher_id, status)
     VALUES (?, ?, ?, 'draft')`,
    [examId, classId, teacherId]
  );

  return result.insertId;
}

async function findApplication(applicationId, teacherId, db = pool) {
  const [rows] = await db.execute(
    `SELECT
       a.id,
       a.exam_id AS examId,
       a.class_id AS classId,
       a.status,
       e.title AS examTitle,
       c.name AS className
     FROM applications a
     INNER JOIN exams e ON e.id = a.exam_id
     INNER JOIN classes c ON c.id = a.class_id
     WHERE a.id = ? AND a.teacher_id = ?`,
    [applicationId, teacherId]
  );

  return rows[0] ?? null;
}


async function listApplications(teacherId, db = pool) {
  const [rows] = await db.execute(
    `SELECT
       a.id,
       a.exam_id AS examId,
       a.class_id AS classId,
       a.status,
       e.title AS examTitle,
       c.name AS className
     FROM applications a
     INNER JOIN exams e ON e.id = a.exam_id
     INNER JOIN classes c ON c.id = a.class_id
     WHERE a.teacher_id = ?
     ORDER BY a.id DESC`,
    [teacherId]
  );

  return rows;
}


module.exports = {
  findOwnedExam,
  findOwnedClass,
  insertApplication,
  findApplication,
  listApplications,
};
