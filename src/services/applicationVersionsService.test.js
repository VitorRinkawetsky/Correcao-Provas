import { describe, expect, it } from 'vitest';

import service from './applicationVersionsService';

const validConfig = () => ({
    embaralharQuestoes: true,
    embaralharAlternativas: true,
    identificacao: false
});

describe('validacao do payload de geracao de versoes', () => {
    it('rejeita com 400 quando um item de configuracao nao e um objeto, em vez de quebrar com 500', async () => {
        for (const malformed of [null, 'texto', 42, []]) {
            await expect(
                service.generateVersions(1, 7, { versoes: [validConfig(), malformed] })
            ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
        }
    });

    it('rejeita com 400 fora do intervalo de 1 a 50 versoes', async () => {
        await expect(
            service.generateVersions(1, 7, { versoes: [] })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });

        await expect(
            service.generateVersions(1, 7, { versoes: Array.from({ length: 51 }, validConfig) })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    it('rejeita antes de validar o payload quando o identificador da aplicacao e invalido', async () => {
        await expect(
            service.generateVersions('abc', 7, { versoes: [validConfig()] })
        ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });
});
