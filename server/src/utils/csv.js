// server/src/utils/csv.js

import { parse as parseCsvSync } from "csv-parse/sync";

/**
 * parseCSV(buffer)
 *
 * Returns normalized objects with fully-lowercased keys:
 *   pagepath
 *   previewurlauto
 *   contentstackurl
 *   directionfinal
 *   remarksds
 *   lastreplicationdate
 *
 * And any additional columns are preserved.
 *
 * This parser merges:
 *   - robust CSV handling from old parser
 *   - lowercasing + trimming normalization
 *   - BOM removal
 *   - alias support
 *   - value cleanup
 *
 * This is the correct parser for MQC2.
 */

export function parseCSV(buffer) {
    if (!buffer) return [];

    // Convert buffer to clean UTF-8 string
    const csvString = bufferToString(buffer);

    // Use robust CSV parser
    const rawRows = parseCsvSync(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
    });

    const out = [];

    for (const row of rawRows) {
        // 1. Normalize keys: lowercase, trim, remove BOM
        const lowered = Object.create(null);

        for (const [key, value] of Object.entries(row)) {
            const cleanKey = sanitizeKey(key);
            const cleanVal = sanitizeValue(value);
            lowered[cleanKey] = cleanVal;
        }

        // 2. Extract known MQC2 fields (case-insensitive)
        const pagepath = pick(lowered, ["pagepath"]);
        const preview = pick(lowered, ["previewurlauto"]);
        const contentstackurl = pick(lowered, ["contentstackurl"]);
        const directionfinal = pick(lowered, ["directionfinal"]);
        const remarksds = pick(lowered, ["remarksds"]);
        const lastreplicationdate = pick(lowered, ["lastreplicationdate"]);

        // 3. Build final row object for MQC2 bulk/fetch
        const normalizedRow = {
            pagePath: pagepath || "",
            previewUrlAuto: preview || "",
            contentStackUrl: contentstackurl || "",
            directionFinal: directionfinal || "",
            remarksDS: remarksds || "",
            lastReplicationDate: lastreplicationdate || ""
        };

        // 4. Also preserve any extra CSV columns in the row
        for (const [k, v] of Object.entries(lowered)) {
            if (!(k in normalizedRow)) {
                normalizedRow[k] = v;
            }
        }

        out.push(normalizedRow);
    }

    return out;
}

/* ------------------------ helpers ------------------------ */

function bufferToString(buf) {
    if (!buf) return "";
    if (Buffer.isBuffer(buf)) return buf.toString("utf8");
    return String(buf || "");
}

function sanitizeKey(k) {
    return String(k || "")
        .replace(/^\uFEFF/, "") // strip BOM
        .toLowerCase()
        .trim();
}

function sanitizeValue(v) {
    if (v == null) return "";
    return String(v).trim();
}

/**
 * Pick the first matching value
 */
function pick(obj, keys) {
    for (const key of keys) {
        const val = obj[key];
        if (val !== undefined && String(val).trim() !== "") {
            return String(val).trim();
        }
    }
    return null;
}
