const { randomBytes } = require('node:crypto');
const { pool } = require('../config/database');
const repository = require('../repositories/classesRepository');
const { ApiError } = require('../http/ApiError');

const positiveId = (value, field = 'id') => {
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Identificador invalido', [{ field }]);
    }
    return Number(value);
};
const text = (value, field, maxLength, required = true) => {
    if (value == null && !required) return '';
    if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > maxLength) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Dados invalidos', [{ field, maxLength }]);
    }
    return value.trim();
};
const validateStatus = (value) => {
    if (!['active', 'archived'].includes(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Status da turma invalido', [{ field: 'status' }]);
    }
    return value;
};
const validateClass = (body, current) => ({
    name: text(body?.name, 'name', 150),
    subject: text(body?.subject, 'subject', 120),
    academicTerm: text(body?.academicTerm ?? body?.term, 'academicTerm', 20),
    status: validateStatus(body?.status ?? current?.status ?? 'active')
});
const ownedClass = async (id, teacherId, db = pool, lock = false) => {
    const classItem = await repository.findClass(positiveId(id), db, lock);
    if (!classItem) throw new ApiError(404, 'NOT_FOUND', 'Turma nao encontrada');
    if (Number(classItem.teacherId) !== teacherId) {
        throw new ApiError(403, 'FORBIDDEN', 'Turma pertence a outro professor');
    }
    return classItem;
};
const editableClass = async (id, teacherId, db) => {
    const classItem = await ownedClass(id, teacherId, db, true);
    if (classItem.status === 'archived') {
        throw new ApiError(409, 'CLASS_ARCHIVED', 'Reative a turma antes de alterar seus alunos ou convite');
    }
    return classItem;
};
const transaction = async (work) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
// The database unique index also guards concurrent invite generation.
const writeWithInvite = async (db, write, previousCode) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = randomBytes(3).toString('hex').toUpperCase();
        if (code === previousCode || await repository.inviteCodeExists(code, db)) continue;
        try {
            return await write(code);
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') throw error;
        }
    }
    throw new ApiError(409, 'INVITE_CONFLICT', 'Nao foi possivel gerar um codigo unico');
};
const details = async (id, teacherId, db = pool) => {
    const classItem = await ownedClass(id, teacherId, db);
    classItem.students = await repository.listStudents(classItem.id, db);
    return classItem;
};
const list = (teacherId, status = 'active') => repository.listClasses(teacherId, validateStatus(status));
const create = (teacherId, body) => {
    const data = validateClass(body);
    return transaction(async (db) => {
        const id = await writeWithInvite(db, (code) => repository.insertClass(teacherId, data, code, db));
        return details(id, teacherId, db);
    });
};
const update = (id, teacherId, body) => transaction(async (db) => {
    const current = await ownedClass(id, teacherId, db, true);
    const data = validateClass(body, current);
    await repository.updateClass(current.id, teacherId, data, db);
    return details(current.id, teacherId, db);
});
const archive = (id, teacherId) => transaction(async (db) => {
    const current = await ownedClass(id, teacherId, db, true);
    await repository.archiveClass(current.id, teacherId, db);
});
const regenerateInvite = (id, teacherId) => transaction(async (db) => {
    const current = await editableClass(id, teacherId, db);
    await writeWithInvite(db, (code) => repository.updateInviteCode(current.id, teacherId, code, db), current.inviteCode);
    return details(current.id, teacherId, db);
});
const students = async (id, teacherId) => {
    const current = await ownedClass(id, teacherId);
    return repository.listStudents(current.id);
};
const addStudent = (id, teacherId, body) => transaction(async (db) => {
    const current = await editableClass(id, teacherId, db);
    let student;
    if (body?.studentId != null) {
        student = await repository.findStudent('id', positiveId(body.studentId, 'studentId'), db);
        if (!student) throw new ApiError(404, 'NOT_FOUND', 'Aluno nao encontrado');
    } else {
        const email = text(body?.email, 'email', 254, false).toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'E-mail invalido', [{ field: 'email' }]);
        }
        const registration = text(body?.registration, 'registration', 40, false);
        const byEmail = email ? await repository.findStudent('email', email, db) : null;
        const byRegistration = registration ? await repository.findStudent('registration', registration, db) : null;
        if ((byEmail && registration && byEmail.registration !== registration)
            || (byRegistration && email && byRegistration.email?.toLowerCase() !== email)) {
            throw new ApiError(409, 'CONFLICT', 'E-mail e matricula identificam registros diferentes');
        }
        student = byEmail || byRegistration;
        if (!student) {
            if (!registration || !body?.fullName) {
                throw new ApiError(400, 'STUDENT_DETAILS_REQUIRED',
                    'Aluno nao encontrado. Informe nome e matricula para cadastra-lo',
                    [{ field: 'fullName' }, { field: 'registration' }]);
            }
            const fullName = text(body.fullName, 'fullName', 150);
            const studentId = await repository.insertStudent({ fullName, registration, email }, db);
            student = await repository.findStudent('id', studentId, db);
        }
    }
    if (student.status !== 'active') {
        throw new ApiError(409, 'STUDENT_INACTIVE', 'Aluno inativo nao pode ser vinculado');
    }
    await repository.enrollStudent(current.id, student.id, db);
    return student;
});
const removeStudent = (id, teacherId, studentId) => transaction(async (db) => {
    const current = await editableClass(id, teacherId, db);
    const removed = await repository.removeStudent(current.id, positiveId(studentId, 'studentId'), db);
    if (!removed) throw new ApiError(404, 'NOT_FOUND', 'Aluno nao vinculado a turma');
});
const grades = async (id, teacherId, studentId) => {
    const current = await ownedClass(id, teacherId);
    const validStudentId = positiveId(studentId, 'studentId');
    if (!await repository.hasEnrollment(current.id, validStudentId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Aluno nao vinculado a turma');
    }
    return repository.listGrades(current.id, validStudentId, teacherId);
};

module.exports = { list, details, create, update, archive, regenerateInvite,
    students, addStudent, removeStudent, grades };
