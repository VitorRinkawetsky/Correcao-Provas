import { describe, expect, it, vi } from 'vitest';

import database from './database';

const { createTransactionRunner } = database;

const createConnection = () => ({
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn()
});

describe('transacoes do banco', () => {
    it('confirma e libera a conexao somente depois do trabalho concluir', async () => {
        const connection = createConnection();
        const pool = { getConnection: vi.fn().mockResolvedValue(connection) };
        const transaction = createTransactionRunner(pool);

        const result = await transaction(async (db) => {
            expect(db).toBe(connection);
            return { id: 17 };
        });

        expect(result).toEqual({ id: 17 });
        expect(connection.beginTransaction).toHaveBeenCalledOnce();
        expect(connection.commit).toHaveBeenCalledOnce();
        expect(connection.rollback).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });

    it('desfaz e libera a conexao quando uma validacao da transacao falha', async () => {
        const connection = createConnection();
        const pool = { getConnection: vi.fn().mockResolvedValue(connection) };
        const transaction = createTransactionRunner(pool);
        const failure = new Error('matricula divergente');

        await expect(transaction(async () => {
            throw failure;
        })).rejects.toBe(failure);

        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.rollback).toHaveBeenCalledOnce();
        expect(connection.release).toHaveBeenCalledOnce();
    });
});
