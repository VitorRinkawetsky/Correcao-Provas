const DEFAULT_SESSION_TTL_HOURS = 8;
const MIN_SESSION_TTL_HOURS = 1;
const MAX_SESSION_TTL_HOURS = 168;
const DEFAULT_LOGIN_WINDOW_MINUTES = 15;
const DEFAULT_LOGIN_ACCOUNT_LIMIT = 10;
const DEFAULT_LOGIN_SOURCE_LIMIT = 100;

const boundedInteger = (value, fallback, minimum, maximum) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
        ? parsed
        : fallback;
};

const configuredHours = Number(process.env.SESSION_TTL_HOURS);
const sessionTtlHours = Number.isFinite(configuredHours)
    && configuredHours >= MIN_SESSION_TTL_HOURS
    && configuredHours <= MAX_SESSION_TTL_HOURS
    ? configuredHours
    : DEFAULT_SESSION_TTL_HOURS;

module.exports = {
    SESSION_TTL_MS: sessionTtlHours * 60 * 60 * 1000,
    LOGIN_RATE_LIMIT_WINDOW_MS: boundedInteger(
        process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES,
        DEFAULT_LOGIN_WINDOW_MINUTES,
        1,
        1440
    ) * 60 * 1000,
    LOGIN_RATE_LIMIT_ACCOUNT_MAX: boundedInteger(
        process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX,
        DEFAULT_LOGIN_ACCOUNT_LIMIT,
        1,
        1000
    ),
    LOGIN_RATE_LIMIT_SOURCE_MAX: boundedInteger(
        process.env.LOGIN_RATE_LIMIT_SOURCE_MAX,
        DEFAULT_LOGIN_SOURCE_LIMIT,
        1,
        10000
    )
};
