const bcrypt = require('bcrypt');
const { createHash, randomBytes } = require('node:crypto');

const professorsRepository = require('../repositories/professorsRepository');
const authRepository = require('../repositories/authRepository');
const { SESSION_TTL_MS } = require('../config/auth');
const { ApiError } = require('../http/ApiError');

const BCRYPT_ROUNDS = 12;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 150;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const EMAIL_LOCAL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+$/i;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
let dummyPasswordHashPromise;

const validationError = (details) => new ApiError(
    400,
    'VALIDATION_ERROR',
    'Revise os dados informados.',
    details
);

const duplicateEmailError = () => new ApiError(
    409,
    'EMAIL_ALREADY_REGISTERED',
    'Este e-mail já está cadastrado.'
);

const invalidCredentialsError = () => new ApiError(
    401,
    'INVALID_CREDENTIALS',
    'E-mail ou senha inválidos.'
);

const unauthenticatedError = () => new ApiError(
    401,
    'UNAUTHENTICATED',
    'Sessão ausente, inválida ou expirada.'
);

const isValidEmail = (email) => {
    if (!email || email.length > MAX_EMAIL_LENGTH) return false;

    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [localPart, domain] = parts;
    if (!localPart
        || localPart.length > 64
        || !EMAIL_LOCAL_PATTERN.test(localPart)
        || localPart.startsWith('.')
        || localPart.endsWith('.')
        || localPart.includes('..')) {
        return false;
    }

    const labels = domain.split('.');
    return domain.length <= 253
        && labels.length >= 2
        && labels.every((label) => EMAIL_DOMAIN_LABEL_PATTERN.test(label));
};

const validateRegistration = (body) => {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const details = [];
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const passwordLength = Array.from(password).length;
    const passwordBytes = Buffer.byteLength(password, 'utf8');

    if (fullName.length < MIN_NAME_LENGTH || fullName.length > MAX_NAME_LENGTH) {
        details.push({
            field: 'fullName',
            message: `Informe um nome entre ${MIN_NAME_LENGTH} e ${MAX_NAME_LENGTH} caracteres.`
        });
    }

    if (!isValidEmail(email)) {
        details.push({ field: 'email', message: 'Informe um e-mail válido.' });
    }

    const hasRequiredGroups = /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password)
        && /[^A-Za-z0-9]/.test(password);

    if (passwordLength < MIN_PASSWORD_LENGTH
        || passwordBytes > MAX_PASSWORD_BYTES
        || !hasRequiredGroups) {
        details.push({
            field: 'password',
            message: 'Use ao menos 8 caracteres, com letra maiúscula, minúscula, número e caractere especial, limitados a 72 bytes.'
        });
    }

    for (const field of ['role', 'userType', 'accountType']) {
        if (Object.hasOwn(input, field)) {
            details.push({
                field,
                message: 'O cadastro é exclusivo para professores e não aceita tipo de conta.'
            });
        }
    }

    if (details.length) throw validationError(details);

    return { fullName, email, password };
};

const validateLogin = (body) => {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const details = [];
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';

    if (!isValidEmail(email)) {
        details.push({ field: 'email', message: 'Informe um e-mail válido.' });
    }
    if (!password || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        details.push({
            field: 'password',
            message: 'Informe uma senha válida de até 72 bytes.'
        });
    }

    for (const field of [
        'teacher_id',
        'teacherId',
        'professor_id',
        'professorId',
        'role',
        'userType',
        'accountType'
    ]) {
        if (Object.hasOwn(input, field)) {
            details.push({
                field,
                message: 'A identidade do professor é definida somente pela credencial.'
            });
        }
    }

    if (details.length) throw validationError(details);

    return { email, password };
};

const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

const isValidSessionToken = (token) => typeof token === 'string'
    && SESSION_TOKEN_PATTERN.test(token);

const publicProfessor = (professor) => ({
    id: Number(professor.id),
    fullName: professor.fullName,
    email: professor.email
});

const comparePassword = async (password, passwordHash) => {
    let hash = passwordHash;

    if (typeof hash !== 'string' || !hash) {
        dummyPasswordHashPromise ||= bcrypt.hash(
            randomBytes(32).toString('base64url'),
            BCRYPT_ROUNDS
        );
        hash = await dummyPasswordHashPromise;
    }

    try {
        return await bcrypt.compare(password, hash);
    } catch (_error) {
        return false;
    }
};

const register = async (body) => {
    const data = validateRegistration(body);

    if (await professorsRepository.findByEmail(data.email)) throw duplicateEmailError();

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    try {
        const id = await professorsRepository.insert({
            fullName: data.fullName,
            email: data.email,
            passwordHash
        });

        return { id, fullName: data.fullName, email: data.email };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw duplicateEmailError();
        throw error;
    }
};

const login = async (body) => {
    const credentials = validateLogin(body);
    const professor = await authRepository.findProfessorCredentialsByEmail(credentials.email);
    const passwordMatches = await comparePassword(credentials.password, professor?.passwordHash);

    if (!professor || !professor.isActive || !passwordMatches) {
        throw invalidCredentialsError();
    }

    const sessionToken = randomBytes(32).toString('base64url');

    await authRepository.deleteExpiredSessions();
    await authRepository.createSession({
        professorId: professor.id,
        tokenHash: hashSessionToken(sessionToken),
        sessionTtlSeconds: SESSION_TTL_MS / 1000
    });

    return {
        professor: publicProfessor(professor),
        sessionToken
    };
};

const authenticateSession = async (sessionToken) => {
    if (!isValidSessionToken(sessionToken)) throw unauthenticatedError();

    const professor = await authRepository.findProfessorBySessionHash(
        hashSessionToken(sessionToken)
    );
    if (!professor) throw unauthenticatedError();

    const result = publicProfessor(professor);
    if (!Number.isSafeInteger(result.id) || result.id < 1) throw unauthenticatedError();

    return result;
};

const logout = async (sessionToken) => {
    if (!isValidSessionToken(sessionToken)) return;
    await authRepository.deleteSession(hashSessionToken(sessionToken));
};

module.exports = {
    register,
    login,
    authenticateSession,
    logout,
    validateRegistration,
    validateLogin
};
