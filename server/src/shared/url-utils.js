// server/src/shared/url-utils.js
import crypto from "node:crypto";

export function screenshotKey(url, mode) {
    const norm = `${url}::${mode}`;
    const hash = crypto.createHash("md5").update(norm).digest("hex");
    return `${hash}-${mode}`;
}

export function urlToPath(url) {
    try {
        const u = new URL(url);
        const host = (u.hostname || "").replace(/\./g, "-");
        const path = (u.pathname || "/").replace(/[^a-zA-Z0-9]+/g, "-");
        const base = `${host}${path}`;
        return (
            base.replace(/-+/g, "-").replace(/^-|-$/g, "") || "page"
        );
    } catch {
        return url.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 80) || "page";
    }
}

// NEW: build an uncached URL by appending ?nocache=<timestamp>
export function withNoCacheParam(url, ts = Date.now()) {
    if (!url) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}nocache=${ts}`;
}
