// src/services/scan.service.js

import { Scan } from "../models/Scan.js";
import { Run } from "../models/Run.js";
import { enqueueScan } from "./enqueueScan.service.js";
import {
    computeLatestCounters,
    isRunFullyComplete
} from "./scanLatest.service.js";

/**
 * Create a new scan entry for any run: single, bulk, fetch, rescan, rerun.
 */
// src/services/scan.service.js

export async function createScan({
                                     runId,
                                     urlOld,
                                     urlNew,
                                     metadata = {},
                                     checkConfig = null, // ✅ change default from {} to null
                                     parentScanId = null
                                 }) {
    // ✅ If caller didn't pass a config (or passed empty {}), derive it from the run
    let effectiveCheckConfig = checkConfig;

    const isEmptyObject =
        effectiveCheckConfig &&
        typeof effectiveCheckConfig === "object" &&
        !Array.isArray(effectiveCheckConfig) &&
        Object.keys(effectiveCheckConfig).length === 0;

    if (effectiveCheckConfig == null || isEmptyObject) {
        const run = await Run.findById(runId).lean();
        effectiveCheckConfig =
            run?.checkConfigSnapshot ||
            run?.checkConfig ||
            run?.checks?.config ||
            {};
    }

    const scan = await Scan.create({
        runId,
        urlOld,
        urlNew,
        metadata,
        checkConfig: effectiveCheckConfig, // ✅ always persist something meaningful
        parentScanId,
        status: "pending",
        createdAt: new Date()
    });

    await Run.findByIdAndUpdate(runId, {
        $push: { scans: scan._id }
    });

    return scan;
}

/**
 * Create rescans: parentScanId = original scan.
 */
export async function createRescansForScanIds(runId, scanIds) {
    const existing = await Scan.find({ _id: { $in: scanIds } });

    if (existing.length !== scanIds.length) {
        throw new Error("Some scans not found for rescan.");
    }

    // Reset run
    await Run.findByIdAndUpdate(runId, {
        status: "running",
        completedScans: 0,
        failedScans: 0,
        completedAt: null
    });

    const created = [];

    for (const oldScan of existing) {
        const newScan = await createScan({
            runId,
            urlOld: oldScan.urlOld,
            urlNew: oldScan.urlNew,
            metadata: oldScan.metadata,
            checkConfig: oldScan.checkConfig,
            parentScanId: oldScan._id
        });

        await enqueueScan(newScan._id);
        created.push(newScan);
    }

    return created;
}

/**
 * Create reruns: parentScanId = null (fresh scans).
 */
export async function createRerunScans(runId) {
    const originals = await Scan.find({ runId, parentScanId: null });

    await Run.findByIdAndUpdate(runId, {
        status: "running",
        completedScans: 0,
        failedScans: 0,
        completedAt: null
    });

    const created = [];

    for (const base of originals) {
        const newScan = await createScan({
            runId,
            urlOld: base.urlOld,
            urlNew: base.urlNew,
            metadata: base.metadata,
            checkConfig: base.checkConfig,
            parentScanId: null
        });

        await enqueueScan(newScan._id);
        created.push(newScan);
    }

    return created;
}

/**
 * Mark scan as running.
 */
export async function markScanRunning(scanId) {
    await Scan.findByIdAndUpdate(scanId, {
        status: "running",
        startedAt: new Date()
    });
}

/**
 * Mark scan as completed and update counters.
 */
export async function markScanCompleted(scanId) {
    const scan = await Scan.findById(scanId);
    if (!scan) return;

    scan.status = "completed";
    scan.completedAt = new Date();
    await scan.save();

    const { completed, failed } = await computeLatestCounters(scan.runId);

    await Run.findByIdAndUpdate(scan.runId, {
        completedScans: completed,
        failedScans: failed
    });

    if (await isRunFullyComplete(scan.runId)) {
        await Run.findByIdAndUpdate(scan.runId, {
            status: "completed",
            completedAt: new Date()
        });
    }
}

/**
 * Mark scan as failed.
 */
export async function markScanFailed(scanId, errorMessage) {
    const scan = await Scan.findById(scanId);
    if (!scan) return;

    scan.status = "failed";
    scan.error = errorMessage || "Unknown error";
    scan.completedAt = new Date();
    await scan.save();

    const { completed, failed } = await computeLatestCounters(scan.runId);

    await Run.findByIdAndUpdate(scan.runId, {
        completedScans: completed,
        failedScans: failed
    });

    if (await isRunFullyComplete(scan.runId)) {
        await Run.findByIdAndUpdate(scan.runId, {
            status: "completed",
            completedAt: new Date()
        });
    }
}

/**
 * Saves full scan results (row-final payload).
 */
export async function saveScanResults(scanId, results) {
    const scan = await Scan.findById(scanId);
    if (!scan) return null;

    scan.results = results;
    await scan.save();
    return scan;
}

export async function getById(id) {
    return Scan.findById(id);
}

export async function recoverDanglingScans() {
    // Recover scans that were pending or stuck "running"
    const scans = await Scan.find({
        status: { $in: ["pending", "running"] },
        deleted: false
    });

    for (const s of scans) {
        console.log(`[R1] Requeue scan ${s._id}`);
        await enqueueScan(s._id);
    }
}
