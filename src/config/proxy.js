const parseTrustedProxyHops = (value) => {
    const hops = Number(value || 0);
    return Number.isSafeInteger(hops) && hops >= 0 && hops <= 5 ? hops : 0;
};

module.exports = {
    TRUST_PROXY_HOPS: parseTrustedProxyHops(process.env.TRUST_PROXY_HOPS),
    parseTrustedProxyHops
};
