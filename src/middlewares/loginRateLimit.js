const { createHash } = require('node:crypto');

const {
    LOGIN_RATE_LIMIT_WINDOW_MS,
    LOGIN_RATE_LIMIT_ACCOUNT_MAX,
    LOGIN_RATE_LIMIT_SOURCE_MAX
} = require('../config/auth');
const { ApiError } = require('../http/ApiError');

const MAX_BUCKETS = 20000;

const createLoginRateLimit = ({
    now = Date.now,
    windowMs = LOGIN_RATE_LIMIT_WINDOW_MS,
    accountMax = LOGIN_RATE_LIMIT_ACCOUNT_MAX,
    sourceMax = LOGIN_RATE_LIMIT_SOURCE_MAX
} = {}) => {
    const buckets = new Map();
    let requestsSincePrune = 0;

    const hashKey = (value) => createHash('sha256').update(value).digest('hex');

    const prune = (currentTime) => {
        requestsSincePrune += 1;
        if (requestsSincePrune < 1000 && buckets.size < MAX_BUCKETS) return;

        for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= currentTime) buckets.delete(key);
        }
        while (buckets.size >= MAX_BUCKETS) {
            buckets.delete(buckets.keys().next().value);
        }
        requestsSincePrune = 0;
    };

    const consume = (key, limit, currentTime) => {
        const existing = buckets.get(key);
        const bucket = !existing || existing.resetAt <= currentTime
            ? { attempts: 0, resetAt: currentTime + windowMs }
            : existing;

        if (bucket.attempts >= limit) return bucket;

        bucket.attempts += 1;
        buckets.delete(key);
        buckets.set(key, bucket);
        return null;
    };

    return (request, response, next) => {
        const currentTime = now();
        const email = typeof request.body?.email === 'string'
            ? request.body.email.trim().toLowerCase()
            : 'invalid-email';
        const source = request.ip || request.socket?.remoteAddress || 'unknown-source';
        const accountKey = hashKey(`account:${email}`);
        const sourceKey = hashKey(`source:${source}`);

        prune(currentTime);
        const blockedBucket = consume(accountKey, accountMax, currentTime)
            || consume(sourceKey, sourceMax, currentTime);

        if (blockedBucket) {
            const retryAfter = Math.max(
                1,
                Math.ceil((blockedBucket.resetAt - currentTime) / 1000)
            );
            response.set('Retry-After', String(retryAfter));
            next(new ApiError(
                429,
                'TOO_MANY_LOGIN_ATTEMPTS',
                'Muitas tentativas de login. Aguarde antes de tentar novamente.'
            ));
            return;
        }

        response.once('finish', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                buckets.delete(accountKey);
            }
        });

        next();
    };
};

module.exports = createLoginRateLimit();
module.exports.createLoginRateLimit = createLoginRateLimit;
