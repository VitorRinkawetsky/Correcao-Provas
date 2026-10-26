import { describe, expect, it } from 'vitest';

import proxyConfig from './proxy';

const { parseTrustedProxyHops } = proxyConfig;

describe('configuracao de proxy confiavel', () => {
    it('aceita somente uma quantidade pequena e explicita de saltos', () => {
        expect(parseTrustedProxyHops('0')).toBe(0);
        expect(parseTrustedProxyHops('1')).toBe(1);
        expect(parseTrustedProxyHops('5')).toBe(5);
    });

    it('recusa configuracoes amplas que permitiriam forjar o IP', () => {
        expect(parseTrustedProxyHops('all')).toBe(0);
        expect(parseTrustedProxyHops('true')).toBe(0);
        expect(parseTrustedProxyHops('-1')).toBe(0);
        expect(parseTrustedProxyHops('6')).toBe(0);
    });
});
