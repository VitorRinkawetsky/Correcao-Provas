
const { pool } = require('../config/database');

async function getReportData(teacherId, filters = {}, db = pool) {
    const conditions = [
        'a.teacher_id = ?',
        "cor.status = 'confirmed'"
    ];

    const params = [teacherId];

    if (filters.classId) {
        conditions.push('a.class_id = ?');
        params.push(filters.classId);
    }

    if (filters.applicationId) {
        conditions.push('a.id = ?');
        params.push(filters.applicationId);
    }

    if (filters.startDate) {
        conditions.push('a.created_at >= ?');
        params.push(`${filters.startDate} 00:00:00`);
    }

    if (filters.endDate) {
        conditions.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        params.push(filters.endDate);
    }

    const [rows] = await db.execute(
        `
        SELECT
            cor.id AS correctionId,
            cor.student_id AS studentId,
            COALESCE(
                s.full_name,
                cor.reported_student_name,
                'Estudante não identificado'
            ) AS studentName,
            s.registration AS registration,
            cor.total_score AS score,
            cor.confirmed_at AS confirmedAt,
            a.id AS applicationId,
            e.title AS examTitle,
            c.id AS classId,
            c.name AS className
        FROM corrections cor
        INNER JOIN exam_versions ev
            ON ev.id = cor.exam_version_id
        INNER JOIN applications a
            ON a.id = ev.application_id
        INNER JOIN exams e
            ON e.id = a.exam_id
        INNER JOIN classes c
            ON c.id = a.class_id
        LEFT JOIN students s
            ON s.id = cor.student_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY cor.confirmed_at DESC, studentName ASC
        `,
        params
    );

    return rows;
}

async function listReportClasses(teacherId, db = pool) {
    const [rows] = await db.execute(
        `
        SELECT DISTINCT c.id, c.name
        FROM classes c
        INNER JOIN applications a ON a.class_id = c.id
        WHERE c.teacher_id = ?
        ORDER BY c.name ASC
        `,
        [teacherId]
    );

    return rows;
}

async function listReportApplications(teacherId, classId = null, db = pool) {
    const conditions = ['a.teacher_id = ?'];
    const params = [teacherId];

    if (classId) {
        conditions.push('a.class_id = ?');
        params.push(classId);
    }

    const [rows] = await db.execute(
        `
        SELECT
    a.id,
    a.class_id AS classId,
    e.title AS examTitle,
    c.name AS className,
    a.created_at AS createdAt
        FROM applications a
        INNER JOIN exams e ON e.id = a.exam_id
        INNER JOIN classes c ON c.id = a.class_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY a.created_at DESC
        `,
        params
    );

    return rows;
}

module.exports = {
    getReportData,
    listReportClasses,
    listReportApplications
};

