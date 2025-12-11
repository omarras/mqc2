// src/services/scanLatest.service.js
import { Scan } from "../models/Scan.js";

/**
 * Build a unique key for a URL pair.
 */
function urlKey(scan) {
    return `${scan.urlOld}:::${scan.urlNew}`;
}

/**
 * Retrieve the latest scan per URL pair for a run.
 * Returns a Map keyed by URL-key.
 */
export async function getLatestScansForRun(runId) {
    const scans = await Scan.find({ runId, deleted: false }).lean();

    const map = new Map();
    for (const s of scans) {
        const key = urlKey(s);

        if (!map.has(key)) {
            map.set(key, s);
        } else {
            const existing = map.get(key);
            if (new Date(s.createdAt) > new Date(existing.createdAt)) {
                map.set(key, s);
            }
        }
    }

    return map;
}

/**
 * Computes counters from the latest-generation scans.
 */
export async function computeLatestCounters(runId) {
    const latest = await getLatestScansForRun(runId);

    let completed = 0;
    let failed = 0;

    for (const s of latest.values()) {
        if (s.status === "completed") completed++;
        else if (s.status === "failed") failed++;
    }

    return { completed, failed, total: latest.size };
}

/**
 * Determine if a run is fully complete:
 * All latest-generation scans must be final.
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
