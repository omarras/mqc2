// src/services/scanLatest.service.js

import { Scan } from "../models/Scan.js";

/**
 * URL key for grouping (latest generation per URL pair).
 */
function urlKey(scan) {
    return `${scan.urlOld}:::${scan.urlNew}`;
}

/**
 * Returns Map<urlKey, latest scan>
 * Ensures:
 * - deleted scans filtered out
 * - missing createdAt handled
 * - consistent latest-generation selection
 */
export async function getLatestScansForRun(runId) {
    const scans = await Scan.find({ runId, deleted: { $ne: true } }).lean();

    const map = new Map();

    for (const s of scans) {
        const key = urlKey(s);

        if (!map.has(key)) {
            map.set(key, s);
        } else {
            const existing = map.get(key);

            const a = new Date(s.createdAt || 0);
            const b = new Date(existing.createdAt || 0);

            if (a > b) map.set(key, s);
        }
    }

    return map;
}

/**
 * Returns { completed, failed, total }
 * From latest-generation scans only.
 */
export async function computeLatestCounters(runId) {
    const latest = await getLatestScansForRun(runId);

    let completed = 0;
    let failed = 0;

    for (const scan of latest.values()) {
        if (scan.status === "completed") completed++;
        else if (scan.status === "failed") failed++;
    }

    return {
        completed,
        failed,
        total: latest.size
    };
}

/**
 * Determines whether all latest scans reached a terminal state:
 * completed | failed
 */
export async function isRunFullyComplete(runId) {
    const latest = await getLatestScansForRun(runId);

    for (const s of latest.values()) {
        if (s.status === "pending" || s.status === "running") {
            return false;
        }
    }

    return true;
}
