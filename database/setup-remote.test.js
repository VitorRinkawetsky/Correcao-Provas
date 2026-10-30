import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import setupRemote from './setup-remote';

const { splitStatements } = setupRemote;
const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');

describe('setup do banco remoto', () => {
    it('nunca envia comandos que trocam ou criam outro banco', () => {
        const statements = splitStatements(initSql);

        expect(statements.length).toBeGreaterThan(0);
        expect(statements.some((statement) => /^\s*USE\b/im.test(statement))).toBe(false);
        expect(statements.some((statement) => /CREATE\s+DATABASE/i.test(statement))).toBe(false);
    });

    it('mantém os triggers inteiros, sem a sintaxe DELIMITER', () => {
        const triggers = splitStatements(initSql).filter((statement) => /CREATE TRIGGER/i.test(statement));

        expect(triggers).toHaveLength(2);
        triggers.forEach((trigger) => {
            expect(trigger).toMatch(/BEGIN[\s\S]*END$/);
            expect(trigger).not.toMatch(/DELIMITER/i);
        });
    });

    it('remove USE mesmo quando há comentários e linhas em branco antes', () => {
        const sql = '-- comentario\n\nSET NAMES utf8mb4;\n\nCREATE DATABASE IF NOT EXISTS x\n    CHARACTER SET utf8mb4;\n\nUSE x;\n\nCREATE TABLE t (id INT);\n';

        expect(splitStatements(sql).join('\n')).not.toMatch(/\bUSE\b|CREATE DATABASE/);
    });
});
