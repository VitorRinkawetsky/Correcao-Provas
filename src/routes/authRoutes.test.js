import bcrypt from 'bcrypt';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import database from '../config/database';
import { handleApiError } from '../http/ApiError';
import requireTeacherSession from '../middlewares/requireTeacherSession';
import authRoutes from './authRoutes';

const { pool, closeDatabaseConnection } = database;
const databaseAvailable = await pool.query('SELECT 1').then(() => true, () => false);

const RUN = `auth_${Date.now()}`;
const createdEmails = [];
const studentIds = [];
let server;
let baseUrl;

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api', requireTeacherSession);
    app.get('/api/private', (request, response) => {
        response.json({ data: { teacherId: request.teacher.id } });
    });
    app.use(handleApiError);
    return app;
};

const call = async (method, path, body, cookie) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(cookie ? { Cookie: cookie } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
        status: response.status,
        body: response.status === 204 ? null : await response.json().catch(() => null),
        setCookie: response.headers.get('set-cookie')
    };
};

const payload = (label, overrides = {}) => ({
    fullName: `Professor ${label}`,
    email: `${RUN}-${label}@example.com`,
    password: 'Senha#2026Segura',
    ...overrides
});

const registerAccount = async (label, overrides) => {
    const input = payload(label, overrides);
    createdEmails.push(input.email.toLowerCase());
    const response = await call('POST', '/api/auth/register', input);
    expect(response.status).toBe(201);
    return input;
};

const loginAccount = async (input, overrides = {}) => {
    const response = await call('POST', '/api/auth/login', {
        email: input.email,
        password: input.password,
        ...overrides
    });
    const cookie = response.setCookie?.split(';')[0] || '';
    return { ...response, cookie };
};

describe('API de autenticação de professores (MySQL)', () => {
    beforeAll(async () => {
        if (!databaseAvailable) {
            throw new Error('MySQL obrigatorio para os testes de integracao de autenticacao.');
        }
        server = buildApp().listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        if (createdEmails.length) {
            await pool.query(
                `DELETE s FROM auth_sessions s
                 INNER JOIN professors p ON p.id = s.professor_id
                 WHERE p.email IN (?)`,
                [createdEmails]
            );
            await pool.query('DELETE FROM professors WHERE email IN (?)', [createdEmails]);
        }
        if (studentIds.length) {
            await pool.query('DELETE FROM students WHERE id IN (?)', [studentIds]);
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await closeDatabaseConnection();
    });

    describe('cadastro', () => {
        it('persiste professor com bcrypt e nunca devolve senha ou hash', async () => {
            const input = payload('cadastro-sucesso');
            createdEmails.push(input.email);

            const response = await call('POST', '/api/auth/register', input);

            expect(response.status).toBe(201);
            expect(response.body.data).toMatchObject({
                fullName: input.fullName,
                email: input.email
            });
            expect(response.body.data).not.toHaveProperty('password');
            expect(response.body.data).not.toHaveProperty('passwordHash');
            expect(response.body.data).not.toHaveProperty('password_hash');

            const [[saved]] = await pool.query(
                `SELECT full_name AS fullName, email, password_hash AS passwordHash
                 FROM professors WHERE email = ?`,
                [input.email]
            );
            expect(saved).toMatchObject({ fullName: input.fullName, email: input.email });
            expect(saved.passwordHash).not.toBe(input.password);
            expect(await bcrypt.compare(input.password, saved.passwordHash)).toBe(true);
        });

        it('responde 409 para e-mail já cadastrado, independentemente da caixa', async () => {
            const input = payload('cadastro-duplicado');
            createdEmails.push(input.email);

            expect((await call('POST', '/api/auth/register', input)).status).toBe(201);
            const duplicate = await call('POST', '/api/auth/register', {
                ...input,
                email: input.email.toUpperCase()
            });

            expect(duplicate.status).toBe(409);
            expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
        });

        it('mantém somente uma conta quando o mesmo e-mail é cadastrado simultaneamente', async () => {
            const input = payload('cadastro-concorrente');
            createdEmails.push(input.email);

            const responses = await Promise.all([
                call('POST', '/api/auth/register', input),
                call('POST', '/api/auth/register', input)
            ]);

            expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
            const [[saved]] = await pool.query(
                'SELECT COUNT(*) AS total FROM professors WHERE email = ?',
                [input.email]
            );
            expect(saved.total).toBe(1);
        });

        it('responde 400 para dados inválidos sem persistir professor', async () => {
            const invalid = [
                payload('cadastro-sem-nome', { fullName: ' ' }),
                payload('cadastro-email-invalido', { email: `${RUN}-invalido` }),
                payload('cadastro-dominio-invalido', { email: `${RUN}@example..com` }),
                payload('cadastro-senha-fraca', { password: '12345678' })
            ];

            for (const input of invalid) {
                const response = await call('POST', '/api/auth/register', input);
                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            }

            const [saved] = await pool.query(
                'SELECT id FROM professors WHERE email IN (?)',
                [invalid.map((input) => input.email.toLowerCase())]
            );
            expect(saved).toHaveLength(0);
        });

        it('não cria conta de aluno nem aceita campo de perfil', async () => {
            const [[before]] = await pool.query('SELECT COUNT(*) AS total FROM students');

            const response = await call('POST', '/api/auth/register',
                payload('cadastro-aluno', { role: 'student' }));

            expect(response.status).toBe(400);
            expect(response.body.error.details)
                .toContainEqual(expect.objectContaining({ field: 'role' }));
            const [[after]] = await pool.query('SELECT COUNT(*) AS total FROM students');
            expect(after.total).toBe(before.total);
        });
    });

    describe('login e sessão', () => {
        it('autentica professor ativo e armazena somente o hash do token', async () => {
            const input = await registerAccount('login-valido');

            const response = await loginAccount(input);

            expect(response.status).toBe(200);
            expect(response.body.data).toMatchObject({
                fullName: input.fullName,
                email: input.email
            });
            expect(response.body.data).not.toHaveProperty('password');
            expect(response.body.data).not.toHaveProperty('passwordHash');
            expect(response.body.data).not.toHaveProperty('sessionToken');
            expect(response.setCookie).toContain('sgp_session=');
            expect(response.setCookie).toContain('HttpOnly');
            expect(response.setCookie).toContain('SameSite=Strict');
            expect(response.setCookie).toContain('Path=/');
            expect(response.cookie).toMatch(/^sgp_session=[A-Za-z0-9_-]{43}$/);

            const [[session]] = await pool.query(
                `SELECT s.token_hash AS tokenHash
                 FROM auth_sessions s
                 INNER JOIN professors p ON p.id = s.professor_id
                 WHERE p.email = ?`,
                [input.email]
            );
            expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);
            expect(response.cookie).not.toContain(session.tokenHash);
        });

        it('restaura o professor em /me e injeta a identidade na rota protegida', async () => {
            const input = await registerAccount('sessao-me');
            const login = await loginAccount(input);
            expect(login.status).toBe(200);

            const me = await call('GET', '/api/auth/me', undefined, login.cookie);
            const privateResponse = await call('GET', '/api/private', undefined, login.cookie);

            expect(me.status).toBe(200);
            expect(me.body.data).toMatchObject({ fullName: input.fullName, email: input.email });
            expect(privateResponse.status).toBe(200);
            expect(privateResponse.body.data.teacherId).toBe(me.body.data.id);
        });

        it('invalida imediatamente a sessÃ£o quando o professor Ã© desativado', async () => {
            const input = await registerAccount('sessao-desativada');
            const login = await loginAccount(input);
            expect(login.status).toBe(200);
            await pool.query('UPDATE professors SET is_active = FALSE WHERE email = ?', [input.email]);

            const me = await call('GET', '/api/auth/me', undefined, login.cookie);

            expect(me.status).toBe(401);
            expect(me.body.error.code).toBe('UNAUTHENTICATED');
        });

        it('rejeita sessÃ£o expirada no banco', async () => {
            const input = await registerAccount('sessao-expirada');
            const login = await loginAccount(input);
            expect(login.status).toBe(200);
            await pool.query(
                `UPDATE auth_sessions AS auth_session
                 INNER JOIN professors AS professor ON professor.id = auth_session.professor_id
                 SET auth_session.expires_at = DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 SECOND)
                 WHERE professor.email = ?`,
                [input.email]
            );

            const me = await call('GET', '/api/auth/me', undefined, login.cookie);

            expect(me.status).toBe(401);
            expect(me.body.error.code).toBe('UNAUTHENTICATED');
        });

        it('gera tokens distintos para duas sessÃµes do mesmo professor', async () => {
            const input = await registerAccount('tokens-unicos');

            const first = await loginAccount(input);
            const second = await loginAccount(input);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(first.cookie).not.toBe(second.cookie);
            const [[sessions]] = await pool.query(
                `SELECT COUNT(*) AS total,
                        COUNT(DISTINCT auth_session.token_hash) AS distinctTokens
                 FROM auth_sessions AS auth_session
                 INNER JOIN professors AS professor ON professor.id = auth_session.professor_id
                 WHERE professor.email = ?`,
                [input.email]
            );
            expect(sessions.total).toBe(2);
            expect(sessions.distinctTokens).toBe(2);
        });

        it('retorna 401 uniforme para e-mail inexistente ou senha incorreta', async () => {
            const input = await registerAccount('credencial-invalida');

            const wrongPassword = await call('POST', '/api/auth/login', {
                email: input.email,
                password: 'Senha#2026Errada'
            });
            const unknownEmail = await call('POST', '/api/auth/login', {
                email: `${RUN}-inexistente@example.com`,
                password: input.password
            });

            for (const response of [wrongPassword, unknownEmail]) {
                expect(response.status).toBe(401);
                expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
                expect(response.setCookie).toBeNull();
            }
            expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
        });

        it('não autentica professor inativo', async () => {
            const input = await registerAccount('professor-inativo');
            await pool.query('UPDATE professors SET is_active = FALSE WHERE email = ?', [input.email]);

            const response = await loginAccount(input);

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
        });

        it('não consulta nem autentica aluno como conta', async () => {
            const email = `${RUN}-aluno@example.com`;
            const [result] = await pool.query(
                `INSERT INTO students (full_name, registration, email)
                 VALUES (?, ?, ?)`,
                ['Aluno sem conta', `${RUN}-matricula`, email]
            );
            studentIds.push(result.insertId);

            const response = await call('POST', '/api/auth/login', {
                email,
                password: 'Senha#2026Segura'
            });

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
        });

        it('rejeita teacher_id e nunca o usa para escolher a identidade', async () => {
            const input = await registerAccount('teacher-id');

            const response = await loginAccount(input, { teacher_id: 1 });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details)
                .toContainEqual(expect.objectContaining({ field: 'teacher_id' }));
            expect(response.setCookie).toBeNull();
        });

        it('bloqueia rota protegida quando o cookie está ausente ou adulterado', async () => {
            const missing = await call('GET', '/api/private');
            const tampered = await call(
                'GET',
                '/api/private',
                undefined,
                `sgp_session=${'a'.repeat(43)}`
            );

            for (const response of [missing, tampered]) {
                expect(response.status).toBe(401);
                expect(response.body.error.code).toBe('UNAUTHENTICATED');
            }
        });

        it('revoga a sessão e expira o cookie no logout', async () => {
            const input = await registerAccount('logout');
            const login = await loginAccount(input);
            expect(login.status).toBe(200);

            const logout = await call('POST', '/api/auth/logout', undefined, login.cookie);
            const afterLogout = await call('GET', '/api/auth/me', undefined, login.cookie);

            expect(logout.status).toBe(204);
            expect(logout.setCookie).toContain('sgp_session=;');
            expect(afterLogout.status).toBe(401);
            const [[sessions]] = await pool.query(
                `SELECT COUNT(*) AS total
                 FROM auth_sessions s
                 INNER JOIN professors p ON p.id = s.professor_id
                 WHERE p.email = ?`,
                [input.email]
            );
            expect(sessions.total).toBe(0);
        });
    });
});
