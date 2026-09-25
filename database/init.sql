-- SGP Catolica - banco local de desenvolvimento
-- MySQL 8.4+
--
-- ATENCAO: este arquivo recria todas as tabelas e apaga os dados existentes.
-- O Docker executa este script somente na primeira criacao do volume.

SET NAMES utf8mb4;
SET time_zone = '-03:00';

CREATE DATABASE IF NOT EXISTS correcao_provas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE correcao_provas;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_student_grades;
DROP VIEW IF EXISTS v_application_progress;

DROP TABLE IF EXISTS correction_answers;
DROP TABLE IF EXISTS corrections;
DROP TABLE IF EXISTS exam_assignments;
DROP TABLE IF EXISTS exam_version_alternatives;
DROP TABLE IF EXISTS exam_version_questions;
DROP TABLE IF EXISTS exam_versions;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS exam_questions;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS question_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS alternatives;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS class_students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS professors;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE professors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_professors_email (email)
) ENGINE = InnoDB;

CREATE TABLE students (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    registration VARCHAR(40) NOT NULL,
    email VARCHAR(254) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_students_registration (registration),
    UNIQUE KEY uq_students_email (email)
) ENGINE = InnoDB;

CREATE TABLE classes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    academic_term VARCHAR(20) NOT NULL,
    status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
    invite_code VARCHAR(20) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_classes_invite_code (invite_code),
    KEY idx_classes_teacher_status (teacher_id, status),
    CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE class_students (
    class_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    enrolled_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (class_id, student_id),
    KEY idx_class_students_student (student_id, status),
    CONSTRAINT fk_class_students_class
        FOREIGN KEY (class_id) REFERENCES classes (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_class_students_student
        FOREIGN KEY (student_id) REFERENCES students (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    statement TEXT NOT NULL,
    status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_questions_teacher_status (teacher_id, status),
    FULLTEXT KEY ftx_questions_statement (statement),
    CONSTRAINT fk_questions_teacher
        FOREIGN KEY (teacher_id) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE alternatives (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question_id BIGINT UNSIGNED NOT NULL,
    position TINYINT UNSIGNED NOT NULL,
    alternative_text VARCHAR(1000) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    correct_question_id BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_alternatives_question_position (question_id, position),
    UNIQUE KEY uq_alternatives_question_id_id (question_id, id),
    UNIQUE KEY uq_alternatives_one_correct (correct_question_id),
    CONSTRAINT chk_alternative_position CHECK (position BETWEEN 1 AND 5),
    CONSTRAINT fk_alternatives_question
        FOREIGN KEY (question_id) REFERENCES questions (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE tags (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_name (name)
) ENGINE = InnoDB;

CREATE TABLE question_tags (
    question_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (question_id, tag_id),
    KEY idx_question_tags_tag (tag_id, question_id),
    CONSTRAINT fk_question_tags_question
        FOREIGN KEY (question_id) REFERENCES questions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_question_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE exams (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    teacher_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    status ENUM('draft', 'ready', 'closed') NOT NULL DEFAULT 'draft',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_exams_teacher_status (teacher_id, status),
    CONSTRAINT fk_exams_teacher
        FOREIGN KEY (teacher_id) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE exam_questions (
    exam_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    question_order SMALLINT UNSIGNED NOT NULL,
    score DECIMAL(6, 2) UNSIGNED NOT NULL,
    PRIMARY KEY (exam_id, question_id),
    UNIQUE KEY uq_exam_questions_order (exam_id, question_order),
    KEY idx_exam_questions_question (question_id),
    CONSTRAINT chk_exam_question_order CHECK (question_order > 0),
    CONSTRAINT chk_exam_question_score CHECK (score > 0),
    CONSTRAINT fk_exam_questions_exam
        FOREIGN KEY (exam_id) REFERENCES exams (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_exam_questions_question
        FOREIGN KEY (question_id) REFERENCES questions (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    exam_id BIGINT UNSIGNED NOT NULL,
    class_id BIGINT UNSIGNED NOT NULL,
    teacher_id BIGINT UNSIGNED NOT NULL,
    status ENUM('draft', 'generated', 'in_correction', 'closed')
        NOT NULL DEFAULT 'draft',
    pdf_url VARCHAR(2048) NULL,
    scheduled_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_applications_exam (exam_id),
    KEY idx_applications_class_status (class_id, status),
    KEY idx_applications_teacher_status (teacher_id, status),
    CONSTRAINT fk_applications_exam
        FOREIGN KEY (exam_id) REFERENCES exams (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_applications_class
        FOREIGN KEY (class_id) REFERENCES classes (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_applications_teacher
        FOREIGN KEY (teacher_id) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE exam_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id BIGINT UNSIGNED NOT NULL,
    version_number SMALLINT UNSIGNED NOT NULL,
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_alternatives BOOLEAN NOT NULL DEFAULT FALSE,
    with_student_identification BOOLEAN NOT NULL DEFAULT TRUE,
    answer_key_published BOOLEAN NOT NULL DEFAULT FALSE,
    answer_key_published_at DATETIME(3) NULL,
    public_code VARCHAR(80) NOT NULL,
    qr_code_payload VARCHAR(500) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_exam_versions_application_number (application_id, version_number),
    UNIQUE KEY uq_exam_versions_public_code (public_code),
    UNIQUE KEY uq_exam_versions_qr_payload (qr_code_payload),
    CONSTRAINT chk_exam_version_number CHECK (version_number > 0),
    CONSTRAINT chk_answer_key_publication
        CHECK (
            answer_key_published = FALSE
            OR answer_key_published_at IS NOT NULL
        ),
    CONSTRAINT fk_exam_versions_application
        FOREIGN KEY (application_id) REFERENCES applications (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE exam_version_questions (
    exam_version_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    printed_order SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (exam_version_id, question_id),
    UNIQUE KEY uq_exam_version_questions_order (exam_version_id, printed_order),
    KEY idx_exam_version_questions_question (question_id),
    CONSTRAINT chk_exam_version_question_order CHECK (printed_order > 0),
    CONSTRAINT fk_exam_version_questions_version
        FOREIGN KEY (exam_version_id) REFERENCES exam_versions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_exam_version_questions_question
        FOREIGN KEY (question_id) REFERENCES questions (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE exam_version_alternatives (
    exam_version_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    alternative_id BIGINT UNSIGNED NOT NULL,
    printed_order TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (exam_version_id, alternative_id),
    UNIQUE KEY uq_exam_version_alternatives_order (
        exam_version_id,
        question_id,
        printed_order
    ),
    CONSTRAINT chk_exam_version_alternative_order
        CHECK (printed_order BETWEEN 1 AND 5),
    CONSTRAINT fk_exam_version_alternatives_version_question
        FOREIGN KEY (exam_version_id, question_id)
        REFERENCES exam_version_questions (exam_version_id, question_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_exam_version_alternatives_alternative
        FOREIGN KEY (question_id, alternative_id)
        REFERENCES alternatives (question_id, id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE exam_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    exam_version_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    qr_code_payload VARCHAR(500) NOT NULL,
    assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_exam_assignments_version_student (exam_version_id, student_id),
    UNIQUE KEY uq_exam_assignments_qr_payload (qr_code_payload),
    KEY idx_exam_assignments_student (student_id),
    CONSTRAINT fk_exam_assignments_version
        FOREIGN KEY (exam_version_id) REFERENCES exam_versions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_exam_assignments_student
        FOREIGN KEY (student_id) REFERENCES students (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE corrections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    exam_assignment_id BIGINT UNSIGNED NULL,
    exam_version_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NULL,
    reported_student_name VARCHAR(150) NULL,
    reported_student_registration VARCHAR(40) NULL,
    status ENUM('pending', 'confirmed') NOT NULL DEFAULT 'pending',
    total_score DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 0,
    notes TEXT NULL,
    confirmed_at DATETIME(3) NULL,
    corrected_by BIGINT UNSIGNED NULL,
    is_automatically_assigned BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_corrections_assignment (exam_assignment_id),
    UNIQUE KEY uq_corrections_version_student (exam_version_id, student_id),
    KEY idx_corrections_version_status (exam_version_id, status),
    KEY idx_corrections_student (student_id),
    CONSTRAINT chk_correction_identification
        CHECK (
            student_id IS NOT NULL
            OR reported_student_registration IS NOT NULL
        ),
    CONSTRAINT chk_correction_confirmation
        CHECK (status <> 'confirmed' OR confirmed_at IS NOT NULL),
    CONSTRAINT fk_corrections_assignment
        FOREIGN KEY (exam_assignment_id) REFERENCES exam_assignments (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_corrections_version
        FOREIGN KEY (exam_version_id) REFERENCES exam_versions (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_corrections_student
        FOREIGN KEY (student_id) REFERENCES students (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_corrections_corrector
        FOREIGN KEY (corrected_by) REFERENCES professors (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE correction_answers (
    correction_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    selected_alternative_id BIGINT UNSIGNED NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    awarded_score DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (correction_id, question_id),
    KEY idx_correction_answers_question (question_id),
    CONSTRAINT fk_correction_answers_correction
        FOREIGN KEY (correction_id) REFERENCES corrections (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_correction_answers_question
        FOREIGN KEY (question_id) REFERENCES questions (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_correction_answers_selected_alternative
        FOREIGN KEY (question_id, selected_alternative_id)
        REFERENCES alternatives (question_id, id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

DELIMITER //

CREATE TRIGGER trg_alternatives_correct_insert
BEFORE INSERT ON alternatives
FOR EACH ROW
BEGIN
    SET NEW.correct_question_id =
        CASE WHEN NEW.is_correct = TRUE THEN NEW.question_id ELSE NULL END;
END//

CREATE TRIGGER trg_alternatives_correct_update
BEFORE UPDATE ON alternatives
FOR EACH ROW
BEGIN
    SET NEW.correct_question_id =
        CASE WHEN NEW.is_correct = TRUE THEN NEW.question_id ELSE NULL END;
END//

DELIMITER ;

INSERT INTO professors (
    id,
    full_name,
    email,
    password_hash,
    created_at
) VALUES
    (1, 'Carlos Henrique Silva', 'carlos.silva@catolicasc.org.br', NULL, '2026-08-01 10:00:00.000');

INSERT INTO students (
    id,
    full_name,
    registration,
    email,
    created_at
) VALUES
    (1, 'João Silva', '20260001', 'joao.silva@catolicasc.edu.br', '2026-08-01 10:05:00.000'),
    (2, 'Maria Oliveira', '20260002', 'maria.oliveira@catolicasc.edu.br', '2026-08-01 10:10:00.000'),
    (3, 'Pedro Souza', '20260003', 'pedro.souza@catolicasc.edu.br', '2026-08-01 10:15:00.000'),
    (4, 'Ana Souza', '20260004', 'ana.souza@catolicasc.edu.br', '2026-08-01 10:20:00.000'),
    (5, 'Lucas Ferreira', '20260005', 'lucas.ferreira@catolicasc.edu.br', '2026-08-01 10:25:00.000'),
    (6, 'Beatriz Almeida', '20260006', 'beatriz.almeida@catolicasc.edu.br', '2026-08-01 10:30:00.000'),
    (7, 'Gabriel Martins', '20260007', 'gabriel.martins@catolicasc.edu.br', '2026-08-01 10:35:00.000'),
    (8, 'Camila Rodrigues', '20260008', 'camila.rodrigues@catolicasc.edu.br', '2026-08-01 10:40:00.000');

INSERT INTO classes (
    id,
    teacher_id,
    name,
    subject,
    academic_term,
    status,
    invite_code
) VALUES
    (1, 1, 'Engenharia de Software - 4ª fase', 'Banco de Dados', '2026/2', 'active', 'AB82CD'),
    (2, 1, 'Análise e Desenvolvimento de Sistemas - 3ª fase', 'Programação Web', '2026/2', 'active', 'WEB26B');

INSERT INTO class_students (class_id, student_id, enrolled_at) VALUES
    (1, 1, '2026-08-02 09:00:00.000'),
    (1, 2, '2026-08-02 09:05:00.000'),
    (1, 3, '2026-08-02 09:10:00.000'),
    (2, 3, '2026-08-02 10:00:00.000'),
    (2, 4, '2026-08-02 10:05:00.000'),
    (2, 5, '2026-08-02 10:10:00.000'),
    (2, 6, '2026-08-02 10:15:00.000'),
    (2, 7, '2026-08-02 10:20:00.000'),
    (2, 8, '2026-08-02 10:25:00.000');

INSERT INTO questions (id, teacher_id, statement, status) VALUES
    (1, 1, 'Qual característica define corretamente uma chave primária em um banco de dados relacional?', 'active'),
    (2, 1, 'Em SQL, qual cláusula é usada para filtrar grupos depois de uma operação de agregação?', 'active'),
    (3, 1, 'Qual forma normal elimina dependências parciais de atributos não-chave em relação a uma chave composta?', 'active'),
    (4, 1, 'Qual operação de JOIN retorna somente linhas com correspondência nas duas tabelas?', 'active'),
    (5, 1, 'No Scrum, quem é responsável por ordenar o Product Backlog para maximizar o valor do produto?', 'active'),
    (6, 1, 'Qual princípio SOLID recomenda que uma classe tenha apenas um motivo para mudar?', 'active'),
    (7, 1, 'Em JavaScript, qual declaração cria uma variável com escopo de bloco que pode receber um novo valor?', 'active'),
    (8, 1, 'Qual método HTTP é normalmente usado para substituir integralmente um recurso existente de forma idempotente?', 'active');

INSERT INTO alternatives (
    id,
    question_id,
    position,
    alternative_text,
    is_correct
) VALUES
    (1, 1, 1, 'Pode conter valores duplicados, desde que sejam ordenados.', FALSE),
    (2, 1, 2, 'Identifica unicamente cada registro e não admite valor nulo.', TRUE),
    (3, 1, 3, 'É usada apenas para armazenar dados temporários.', FALSE),
    (4, 1, 4, 'Precisa ser formada por todas as colunas da tabela.', FALSE),
    (5, 2, 1, 'HAVING', TRUE),
    (6, 2, 2, 'ORDER BY', FALSE),
    (7, 2, 3, 'WHERE', FALSE),
    (8, 2, 4, 'DISTINCT', FALSE),
    (9, 3, 1, 'Primeira Forma Normal (1FN)', FALSE),
    (10, 3, 2, 'Terceira Forma Normal (3FN)', FALSE),
    (11, 3, 3, 'Forma Normal de Boyce-Codd (FNBC)', FALSE),
    (12, 3, 4, 'Segunda Forma Normal (2FN)', TRUE),
    (13, 4, 1, 'LEFT JOIN', FALSE),
    (14, 4, 2, 'FULL OUTER JOIN', FALSE),
    (15, 4, 3, 'INNER JOIN', TRUE),
    (16, 4, 4, 'CROSS JOIN', FALSE),
    (17, 5, 1, 'Scrum Master', FALSE),
    (18, 5, 2, 'Product Owner', TRUE),
    (19, 5, 3, 'Patrocinador do projeto', FALSE),
    (20, 5, 4, 'Equipe de infraestrutura', FALSE),
    (21, 6, 1, 'Princípio da Responsabilidade Única', TRUE),
    (22, 6, 2, 'Princípio Aberto-Fechado', FALSE),
    (23, 6, 3, 'Princípio da Substituição de Liskov', FALSE),
    (24, 6, 4, 'Princípio da Inversão de Dependência', FALSE),
    (25, 7, 1, 'var', FALSE),
    (26, 7, 2, 'const', FALSE),
    (27, 7, 3, 'let', TRUE),
    (28, 8, 1, 'POST', FALSE),
    (29, 8, 2, 'PATCH', FALSE),
    (30, 8, 3, 'PUT', TRUE),
    (31, 8, 4, 'CONNECT', FALSE);

INSERT INTO tags (id, name) VALUES
    (1, 'Banco de Dados'),
    (2, 'Modelagem'),
    (3, 'SQL'),
    (4, 'Normalização'),
    (5, 'Engenharia de Software'),
    (6, 'Métodos Ágeis'),
    (7, 'SOLID'),
    (8, 'Programação'),
    (9, 'JavaScript'),
    (10, 'Programação Web'),
    (11, 'HTTP');

INSERT INTO question_tags (question_id, tag_id) VALUES
    (1, 1), (1, 2),
    (2, 1), (2, 3),
    (3, 1), (3, 4),
    (4, 1), (4, 3),
    (5, 5), (5, 6),
    (6, 5), (6, 7),
    (7, 8), (7, 9),
    (8, 10), (8, 11);

INSERT INTO exams (
    id,
    teacher_id,
    title,
    description,
    status,
    created_at
) VALUES
    (1, 1, 'P1 - Banco de Dados', 'Primeira avaliação da disciplina de Banco de Dados.', 'ready', '2026-08-10 10:00:00.000'),
    (2, 1, 'P2 - SQL', 'Segunda avaliação da disciplina de Banco de Dados, com foco em consultas SQL.', 'draft', '2026-08-12 13:30:00.000'),
    (3, 1, 'Fundamentos de Programação Web', 'Avaliação sobre JavaScript, HTTP e integração com dados relacionais.', 'closed', '2026-07-20 14:00:00.000');

INSERT INTO exam_questions (exam_id, question_id, question_order, score) VALUES
    (1, 1, 1, 1.25), (1, 2, 2, 1.25), (1, 3, 3, 1.25), (1, 4, 4, 1.25),
    (1, 5, 5, 1.25), (1, 6, 6, 1.25), (1, 7, 7, 1.25), (1, 8, 8, 1.25),
    (2, 1, 1, 1.00), (2, 2, 2, 1.00), (2, 3, 3, 1.00), (2, 4, 4, 1.00),
    (2, 5, 5, 1.00), (2, 6, 6, 1.00), (2, 7, 7, 1.00), (2, 8, 8, 1.00),
    (3, 4, 1, 2.00), (3, 7, 2, 2.00), (3, 8, 3, 2.00), (3, 6, 4, 4.00);

INSERT INTO applications (
    id,
    exam_id,
    class_id,
    teacher_id,
    status,
    pdf_url,
    created_at
) VALUES
    (1, 1, 1, 1, 'generated', NULL, '2026-08-15 10:00:00.000'),
    (2, 3, 2, 1, 'draft', NULL, '2026-08-16 09:00:00.000'),
    (3, 3, 1, 1, 'closed', NULL, '2026-07-25 12:00:00.000');

INSERT INTO exam_versions (
    id,
    application_id,
    version_number,
    shuffle_questions,
    shuffle_alternatives,
    with_student_identification,
    answer_key_published,
    answer_key_published_at,
    public_code,
    qr_code_payload,
    created_at
) VALUES
    (1, 1, 1, TRUE, TRUE, TRUE, FALSE, NULL, 'PUB-BD01V1', 'MOCK-QR-VERSION-01', '2026-08-15 11:00:00.000'),
    (2, 1, 2, TRUE, FALSE, TRUE, FALSE, NULL, 'PUB-BD01V2', 'MOCK-QR-VERSION-02', '2026-08-15 11:05:00.000'),
    (3, 1, 3, FALSE, TRUE, TRUE, TRUE, '2026-08-17 18:00:00.000', 'PUB-BD01V3', 'MOCK-QR-VERSION-03', '2026-08-15 11:10:00.000'),
    (4, 3, 1, FALSE, FALSE, FALSE, TRUE, '2026-07-27 17:30:00.000', 'PUB-WEB03V1', 'MOCK-QR-VERSION-04', '2026-07-25 13:00:00.000');

INSERT INTO exam_version_questions (
    exam_version_id,
    question_id,
    printed_order
) VALUES
    (1, 3, 1), (1, 1, 2), (1, 5, 3), (1, 4, 4),
    (1, 2, 5), (1, 6, 6), (1, 7, 7), (1, 8, 8),
    (2, 2, 1), (2, 4, 2), (2, 1, 3), (2, 5, 4),
    (2, 3, 5), (2, 6, 6), (2, 7, 7), (2, 8, 8),
    (3, 1, 1), (3, 2, 2), (3, 3, 3), (3, 4, 4),
    (3, 5, 5), (3, 6, 6), (3, 7, 7), (3, 8, 8),
    (4, 4, 1), (4, 7, 2), (4, 8, 3), (4, 6, 4);

INSERT INTO exam_version_alternatives (
    exam_version_id,
    question_id,
    alternative_id,
    printed_order
)
SELECT
    1,
    a.question_id,
    a.id,
    CASE a.id
        WHEN 11 THEN 1 WHEN 9 THEN 2 WHEN 12 THEN 3 WHEN 10 THEN 4
        WHEN 4 THEN 1 WHEN 2 THEN 2 WHEN 1 THEN 3 WHEN 3 THEN 4
        WHEN 19 THEN 1 WHEN 17 THEN 2 WHEN 20 THEN 3 WHEN 18 THEN 4
        WHEN 14 THEN 1 WHEN 13 THEN 2 WHEN 15 THEN 3 WHEN 16 THEN 4
        WHEN 7 THEN 1 WHEN 8 THEN 2 WHEN 5 THEN 3 WHEN 6 THEN 4
        ELSE a.position
    END
FROM alternatives AS a
WHERE a.question_id BETWEEN 1 AND 8;

INSERT INTO exam_version_alternatives (
    exam_version_id,
    question_id,
    alternative_id,
    printed_order
)
SELECT
    2,
    a.question_id,
    a.id,
    CASE a.id
        WHEN 5 THEN 1 WHEN 6 THEN 2 WHEN 7 THEN 3 WHEN 8 THEN 4
        WHEN 13 THEN 1 WHEN 14 THEN 2 WHEN 15 THEN 3 WHEN 16 THEN 4
        WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4
        WHEN 17 THEN 1 WHEN 18 THEN 2 WHEN 19 THEN 3 WHEN 20 THEN 4
        WHEN 9 THEN 1 WHEN 10 THEN 2 WHEN 11 THEN 3 WHEN 12 THEN 4
        ELSE a.position
    END
FROM alternatives AS a
WHERE a.question_id BETWEEN 1 AND 8;

INSERT INTO exam_version_alternatives (
    exam_version_id,
    question_id,
    alternative_id,
    printed_order
)
SELECT
    3,
    a.question_id,
    a.id,
    CASE a.id
        WHEN 3 THEN 1 WHEN 4 THEN 2 WHEN 2 THEN 3 WHEN 1 THEN 4
        WHEN 6 THEN 1 WHEN 5 THEN 2 WHEN 8 THEN 3 WHEN 7 THEN 4
        WHEN 12 THEN 1 WHEN 11 THEN 2 WHEN 10 THEN 3 WHEN 9 THEN 4
        WHEN 16 THEN 1 WHEN 15 THEN 2 WHEN 13 THEN 3 WHEN 14 THEN 4
        WHEN 20 THEN 1 WHEN 19 THEN 2 WHEN 18 THEN 3 WHEN 17 THEN 4
        ELSE a.position
    END
FROM alternatives AS a
WHERE a.question_id BETWEEN 1 AND 8;

INSERT INTO exam_version_alternatives (
    exam_version_id,
    question_id,
    alternative_id,
    printed_order
)
SELECT
    4,
    a.question_id,
    a.id,
    a.position
FROM alternatives AS a
WHERE a.question_id IN (4, 6, 7, 8);

INSERT INTO exam_assignments (
    id,
    exam_version_id,
    student_id,
    qr_code_payload,
    assigned_at
) VALUES
    (1, 1, 1, 'MOCK-QR-STUDENT-01', '2026-08-15 11:30:00.000'),
    (2, 2, 2, 'MOCK-QR-STUDENT-02', '2026-08-15 11:31:00.000'),
    (3, 3, 3, 'MOCK-QR-STUDENT-03', '2026-08-15 11:32:00.000');

INSERT INTO corrections (
    id,
    exam_assignment_id,
    exam_version_id,
    student_id,
    reported_student_name,
    reported_student_registration,
    status,
    total_score,
    notes,
    confirmed_at,
    corrected_by,
    is_automatically_assigned,
    sync_status,
    created_at
) VALUES
    (1, 1, 1, 1, NULL, NULL, 'confirmed', 8.75, 'Boa compreensão geral. Recomenda-se revisar a Segunda Forma Normal.', '2026-08-16 14:30:00.000', 1, TRUE, 'synced', '2026-08-16 14:20:00.000'),
    (2, 2, 2, 2, NULL, NULL, 'confirmed', 8.75, NULL, '2026-08-16 15:10:00.000', 1, TRUE, 'synced', '2026-08-16 15:00:00.000'),
    (3, 3, 3, 3, NULL, NULL, 'confirmed', 6.25, 'Recomenda-se revisar normalização e conceitos de modelagem.', '2026-08-16 15:45:00.000', 1, TRUE, 'synced', '2026-08-16 15:35:00.000'),
    (4, NULL, 4, NULL, 'Pedro Santos', '20269999', 'confirmed', 8.00, 'Aguardando associação manual com um estudante da turma.', '2026-07-27 16:20:00.000', 1, FALSE, 'pending', '2026-07-27 16:10:00.000');

INSERT INTO correction_answers (
    correction_id,
    question_id,
    selected_alternative_id,
    is_correct,
    awarded_score
) VALUES
    (1, 1, 2, TRUE, 1.25), (1, 2, 5, TRUE, 1.25),
    (1, 3, 9, FALSE, 0.00), (1, 4, 15, TRUE, 1.25),
    (1, 5, 18, TRUE, 1.25), (1, 6, 21, TRUE, 1.25),
    (1, 7, 27, TRUE, 1.25), (1, 8, 30, TRUE, 1.25),
    (2, 1, 2, TRUE, 1.25), (2, 2, 5, TRUE, 1.25),
    (2, 3, 9, FALSE, 0.00), (2, 4, 15, TRUE, 1.25),
    (2, 5, 18, TRUE, 1.25), (2, 6, 21, TRUE, 1.25),
    (2, 7, 27, TRUE, 1.25), (2, 8, 30, TRUE, 1.25),
    (3, 1, 1, FALSE, 0.00), (3, 2, 5, TRUE, 1.25),
    (3, 3, 12, TRUE, 1.25), (3, 4, 15, TRUE, 1.25),
    (3, 5, 17, FALSE, 0.00), (3, 6, 21, TRUE, 1.25),
    (3, 7, 27, TRUE, 1.25), (3, 8, 28, FALSE, 0.00),
    (4, 4, 15, TRUE, 2.00), (4, 7, 27, TRUE, 2.00),
    (4, 8, 28, FALSE, 0.00), (4, 6, 21, TRUE, 4.00);

CREATE VIEW v_application_progress AS
SELECT
    application.id AS application_id,
    application.exam_id,
    application.class_id,
    application.status,
    COUNT(DISTINCT assignment.id) AS assigned_students,
    COUNT(
        DISTINCT CASE
            WHEN correction.status = 'confirmed' THEN correction.id
            ELSE NULL
        END
    ) AS corrected_submissions
FROM applications AS application
LEFT JOIN exam_versions AS version
    ON version.application_id = application.id
LEFT JOIN exam_assignments AS assignment
    ON assignment.exam_version_id = version.id
LEFT JOIN corrections AS correction
    ON correction.exam_version_id = version.id
GROUP BY
    application.id,
    application.exam_id,
    application.class_id,
    application.status;

CREATE VIEW v_student_grades AS
SELECT
    correction.id AS correction_id,
    correction.student_id,
    student.full_name AS student_name,
    student.registration,
    exam.id AS exam_id,
    exam.title AS exam_title,
    application.id AS application_id,
    correction.total_score,
    correction.confirmed_at
FROM corrections AS correction
INNER JOIN students AS student
    ON student.id = correction.student_id
INNER JOIN exam_versions AS version
    ON version.id = correction.exam_version_id
INNER JOIN applications AS application
    ON application.id = version.application_id
INNER JOIN exams AS exam
    ON exam.id = application.exam_id
WHERE correction.status = 'confirmed';
