import { describe, expect, it } from 'vitest';

import service from './authService';

const validPayload = (overrides = {}) => ({
    fullName: '  Maria da Silva  ',
    email: '  MARIA.SILVA@EXAMPLE.COM  ',
    password: 'Senha#2026Segura',
    ...overrides
});

const validationFields = (payload) => {
    try {
        service.validateRegistration(payload);
    } catch (error) {
        expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        return error.details.map((detail) => detail.field);
    }

    throw new Error('Era esperado um erro de validação');
};

describe('validação do cadastro de professor', () => {
    it('normaliza nome e e-mail sem transformar a senha', () => {
        const data = service.validateRegistration(validPayload());

        expect(data).toEqual({
            fullName: 'Maria da Silva',
            email: 'maria.silva@example.com',
            password: 'Senha#2026Segura'
        });
    });

    it('rejeita nome vazio, curto ou acima do limite do banco', () => {
        expect(validationFields(validPayload({ fullName: ' ' }))).toContain('fullName');
        expect(validationFields(validPayload({ fullName: 'A' }))).toContain('fullName');
        expect(validationFields(validPayload({ fullName: 'A'.repeat(151) }))).toContain('fullName');
    });

    it('rejeita e-mail ausente, malformado ou acima do limite do banco', () => {
        expect(validationFields(validPayload({ email: '' }))).toContain('email');
        expect(validationFields(validPayload({ email: 'maria@' }))).toContain('email');
        expect(validationFields(validPayload({ email: 'maria@example..com' }))).toContain('email');
        expect(validationFields(validPayload({ email: 'maria@-example.com' }))).toContain('email');
        expect(validationFields(validPayload({ email: '.maria@example.com' }))).toContain('email');
        expect(validationFields(validPayload({ email: 'maria..silva@example.com' }))).toContain('email');
        expect(validationFields(validPayload({ email: 'maria()@example.com' }))).toContain('email');
        expect(validationFields(validPayload({ email: `${'a'.repeat(245)}@example.com` })))
            .toContain('email');
    });

    it('aceita alias e subdomínio em e-mail válido', () => {
        expect(service.validateRegistration(validPayload({
            email: 'maria+provas@docentes.example.com'
        })).email).toBe('maria+provas@docentes.example.com');
    });

    it('exige todos os grupos de caracteres da senha forte', () => {
        const weakPasswords = [
            'senha#2026',
            'SENHA#2026',
            'SenhaForte#',
            'Senha2026',
            'Aa1!',
            'Aa1!áá'
        ];

        for (const password of weakPasswords) {
            expect(validationFields(validPayload({ password })), password).toContain('password');
        }
    });

    it('limita a senha a 72 bytes para não sofrer truncamento do bcrypt', () => {
        expect(service.validateRegistration(validPayload({
            password: `Aa1!${'a'.repeat(68)}`
        })).password).toHaveLength(72);

        expect(validationFields(validPayload({
            password: `Aa1!${'á'.repeat(35)}`
        }))).toContain('password');
    });

    it('rejeita qualquer tentativa de escolher um tipo de conta', () => {
        expect(validationFields(validPayload({ role: 'student' }))).toContain('role');
        expect(validationFields(validPayload({ userType: 'professor' }))).toContain('userType');
    });
});
