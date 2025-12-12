export function deepSet(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
    }

    cur[parts[parts.length - 1]] = value;
}
