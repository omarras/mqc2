// src/validators/util.js
export function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

export function isHttpsUrl(value) {
    if (!isNonEmptyString(value)) return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:";
    } catch {
        return false;
    }
}

export function assert(condition, message) {
    if (!condition) {
        const err = new Error(message);
        err.status = 400;
        throw err;
    }
}
