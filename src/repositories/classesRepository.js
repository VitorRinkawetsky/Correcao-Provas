const { pool } = require('../config/database');

const classProjection = `SELECT c.id, c.teacher_id AS teacherId, c.name, c.subject,
    c.academic_term AS academicTerm, c.academic_term AS term, c.status,
    c.invite_code AS inviteCode, c.created_at AS createdAt, c.updated_at AS updatedAt,
    (SELECT COUNT(*) FROM class_students cs
        WHERE cs.class_id = c.id AND cs.status = 'active') AS studentCount
    FROM classes c`;

const listClasses = async (teacherId, status, db = pool) => {
    const [rows] = await db.execute(`${classProjection}
        WHERE c.teacher_id = ? AND c.status = ? ORDER BY c.name, c.id`, [teacherId, status]);
    return rows;
};
const findClass = async (id, db = pool, lock = false) => {
    const [rows] = await db.execute(`${classProjection} WHERE c.id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
    return rows[0] || null;
};
const insertClass = async (teacherId, data, inviteCode, db) => {
    const [result] = await db.execute(`INSERT INTO classes
        (teacher_id, name, subject, academic_term, status, invite_code) VALUES (?, ?, ?, ?, ?, ?)`,
        [teacherId, data.name, data.subject, data.academicTerm, data.status, inviteCode]);
    return result.insertId;
};
const updateClass = (id, teacherId, data, db) => db.execute(`UPDATE classes
    SET name = ?, subject = ?, academic_term = ?, status = ? WHERE id = ? AND teacher_id = ?`,
    [data.name, data.subject, data.academicTerm, data.status, id, teacherId]);
const archiveClass = (id, teacherId, db) => db.execute(
    "UPDATE classes SET status = 'archived' WHERE id = ? AND teacher_id = ?", [id, teacherId]);
const updateInviteCode = (id, teacherId, inviteCode, db) => db.execute(
    'UPDATE classes SET invite_code = ? WHERE id = ? AND teacher_id = ?', [inviteCode, id, teacherId]);
const inviteCodeExists = async (code, db) => {
    const [rows] = await db.execute('SELECT id FROM classes WHERE invite_code = ? LIMIT 1', [code]);
    return rows.length > 0;
};
const listStudents = async (classId, db = pool) => {
    const [rows] = await db.execute(`SELECT s.id, s.full_name AS fullName, s.registration,
        s.email, s.status, cs.enrolled_at AS enrolledAt
        FROM class_students cs INNER JOIN students s ON s.id = cs.student_id
        WHERE cs.class_id = ? AND cs.status = 'active' ORDER BY s.full_name, s.id`, [classId]);
    return rows;
};
const findStudent = async (field, value, db) => {
    // Column names come from this allowlist; user values are bound parameters.
    const columns = { id: 's.id', email: 's.email', registration: 's.registration' };
    if (!columns[field]) throw new Error('Invalid student lookup');
    const [rows] = await db.execute(`SELECT s.id, s.full_name AS fullName,
        s.registration, s.email, s.status FROM students s WHERE ${columns[field]} = ?`, [value]);
    return rows[0] || null;
};
const insertStudent = async (data, db) => {
    const [result] = await db.execute(
        'INSERT INTO students (full_name, registration, email) VALUES (?, ?, ?)',
        [data.fullName, data.registration, data.email || null]);
    return result.insertId;
};
const enrollStudent = (classId, studentId, db) => db.execute(`INSERT INTO class_students
    (class_id, student_id, status) VALUES (?, ?, 'active')
    ON DUPLICATE KEY UPDATE status = 'active'`, [classId, studentId]);
const removeStudent = async (classId, studentId, db) => {
    const [result] = await db.execute(
        `UPDATE class_students SET status = 'inactive'
            WHERE class_id = ? AND student_id = ? AND status = 'active'`, [classId, studentId]);
    return result.affectedRows;
};
const hasEnrollment = async (classId, studentId, db = pool) => {
    const [rows] = await db.execute(`SELECT student_id FROM class_students
        WHERE class_id = ? AND student_id = ? AND status = 'active'`, [classId, studentId]);
    return rows.length > 0;
};
const listGrades = async (classId, studentId, teacherId, db = pool) => {
    const [rows] = await db.execute(`SELECT g.correction_id AS correctionId,
        g.student_id AS studentId, g.student_name AS studentName, g.registration,
        g.exam_id AS examId, g.exam_title AS examTitle, g.application_id AS applicationId,
        g.total_score AS totalScore, g.confirmed_at AS confirmedAt
        FROM v_student_grades g INNER JOIN applications a ON a.id = g.application_id
        WHERE a.class_id = ? AND a.teacher_id = ? AND g.student_id = ?
        ORDER BY g.confirmed_at DESC, g.correction_id DESC`, [classId, teacherId, studentId]);
    return rows;
};

module.exports = { listClasses, findClass, insertClass, updateClass, archiveClass,
    updateInviteCode, inviteCodeExists, listStudents, findStudent, insertStudent,
    enrollStudent, removeStudent, hasEnrollment, listGrades };
