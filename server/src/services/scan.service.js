// src/services/scan.service.js

import { Scan } from "../models/Scan.js";
import { Run } from "../models/Run.js";
import { enqueueScan } from "./enqueueScan.service.js";
import {
    computeLatestCounters,
    getLatestScansForRun,
    isRunFullyComplete
} from "./scanLatest.service.js";

/**
 * Create a new scan for a run (used for original runs, rescans, reruns).
 */
export async function createScan({
                                     runId,
                                     urlOld,
                                     urlNew,
                                     metadata = {},
                                     checkConfig = {},
                                     parentScanId = null
                                 }) {
    const scan = await Scan.create({
        runId,
        urlOld,
        urlNew,
        metadata,
        checkConfig,
        parentScanId,
        status: "pending"
    });

    // Add to run
    await Run.findByIdAndUpdate(runId, {
        $push: { scans: scan._id }
    });

    return scan;
}

/**
 * Create rescans for specific scan IDs.
 */
export async function createRescansForScanIds(runId, scanIds) {
    const existingScans = await Scan.find({ _id: { $in: scanIds } });

    if (existingScans.length !== scanIds.length) {
        throw new Error("Some scans not found for rescan.");
    }

    // Reset run counters and reopen it
    await Run.findByIdAndUpdate(runId, {
        status: "running",
        completedScans: 0,
        failedScans: 0,
        completedAt: null
    });

    const newScans = [];

    for (const oldScan of existingScans) {
        const newScan = await createScan({
            runId,
            urlOld: oldScan.urlOld,
            urlNew: oldScan.urlNew,
            metadata: oldScan.metadata,
            checkConfig: oldScan.checkConfig,
            parentScanId: oldScan._id
        });

        await enqueueScan(newScan._id);
        newScans.push(newScan);
    }

    return newScans;
}

/**
 * Create a rerun: a new scan for each original URL pair (parentScanId = null).
 */
export async function createRerunScans(runId) {
    const originals = await Scan.find({ runId, parentScanId: null });

    // Reset run counters and reopen the run
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
        status: "running"
    });
}

/**
 * Mark scan as completed and update run counters accordingly.
 */
export async function markScanCompleted(scanId) {
    const scan = await Scan.findById(scanId);
    if (!scan) return;

    scan.status = "completed";
    scan.completedAt = new Date();
    await scan.save();

    // Recompute run counters
    const { completed, failed } = await computeLatestCounters(scan.runId);

    await Run.findByIdAndUpdate(scan.runId, {
        completedScans: completed,
        failedScans: failed
    });

    // Evaluate run completion
    if (await isRunFullyComplete(scan.runId)) {
        await Run.findByIdAndUpdate(scan.runId, {
            status: "completed",
            completedAt: new Date()
        });
    }
}

/**
 * Mark scan as failed and update run counters accordingly.
 */
export async function markScanFailed(scanId, errorMessage) {
    const scan = await Scan.findById(scanId);
    if (!scan) return;

    scan.status = "failed";
    scan.error = errorMessage;
    scan.completedAt = new Date();
    await scan.save();

    // Recompute run counters
    const { completed, failed } = await computeLatestCounters(scan.runId);

    await Run.findByIdAndUpdate(scan.runId, {
        completedScans: completed,
        failedScans: failed
    });

    // Evaluate run completion
    if (await isRunFullyComplete(scan.runId)) {
        await Run.findByIdAndUpdate(scan.runId, {
            status: "completed",
            completedAt: new Date()
        });
    }
}

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
