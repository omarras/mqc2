// src/services/run.service.js

import { Run } from "../models/Run.js";
import { Scan } from "../models/Scan.js";
import { normalizeMany } from "../utils/scanNormalizer.js";
import { fastQueue, slowQueue } from "./scanQueue.service.js";
import { enqueueScan } from "./enqueueScan.service.js";
import { sseManager } from "./sse.service.js";
import {
    computeLatestCounters,
    getLatestScansForRun,
    isRunFullyComplete
} from "./scanLatest.service.js";
import { runQueue } from "./runQueue.service.js";

/**
 * Create a run with default counters.
 */
export async function createRun(type, runName, runNameAuto = null) {
    return Run.create({
        type,
        runName,
        runNameAuto: runNameAuto || `run-${Date.now()}`,
        status: "pending",
        totalScans: 0,
        completedScans: 0,
        failedScans: 0,
        createdAt: new Date()
    });
}

/**
 * Append scans to a run.
 */
export async function addScansToRun(runId, scanIds) {
    return Run.findByIdAndUpdate(
        runId,
        { $push: { scans: { $each: scanIds } } },
        { new: true }
    );
}

/**
 * Run + latest scans only.
 */
export async function getRunWithLatestScans(id) {
    const run = await Run.findById(id).lean();
    if (!run) return null;

    const latest = await getLatestScansForRun(id);

    return {
        ...run,
        latestScans: Array.from(latest.values())
    };
}

export async function getRunWithAllScans(id) {
    const run = await Run.findById(id).lean();
    if (!run) return null;

    // Use the latest normalized snapshots instead of raw Scan docs
    const latestMap = await getLatestScansForRun(id);
    // latestMap is a Map<scanId, snapshot>

    const scans = Array.from(latestMap.values()).map(snap => ({
        ...snap,
        // Frontend expects _id, snapshots use scanId
        _id: snap._id || snap.scanId
    }));

    return {
        ...run,
        scans
    };
}

export async function listRuns() {
    return Run.find().sort({ createdAt: -1 });
}

export async function setTotals(runId, count, options = {}) {
    const run = await Run.findById(runId);
    if (!run) return null;

    if (options.append) {
        run.totalScans += count;
    } else {
        run.totalScans = count;
    }

    await run.save();
    return run;
}

export async function markRunning(runId) {
    return Run.findByIdAndUpdate(runId, {
        status: "running",
        completedAt: null
    });
}

/**
 * Central 2-phase coordinator.
 * Ensures FULL determinism and correct SSE finalization.
 */
export async function runCoordinator(runId) {
    // -----------------------------
    // PHASE 1 — Wait for fastQueue
    // -----------------------------
    await fastQueue.onIdle();

    const scans = await Scan.find({ runId, deleted: { $ne: true } });

    // Validate pageDataCheck existence
    const missingPD = scans.filter(s => !s.metadata?.pageDataCheck);
    if (missingPD.length > 0) {
        console.error(`[runCoordinator] Missing pageDataCheck for ${missingPD.length} scans`);
    }

    // --------------------------------------
    // PHASE 2 — enqueue only valid scans
    // --------------------------------------
    const continueScans = scans.filter(s => {
        const pd = s.metadata?.pageDataCheck;
        return pd && pd.shouldContinue !== false;
    });

    for (const scan of continueScans) {
        await enqueueScan(scan._id);
    }

    // --------------------------------------
    // PHASE 2 — wait for slowQueue
    // --------------------------------------
    await slowQueue.onIdle();

    // --------------------------------------
    // Final evaluation
    // --------------------------------------
    const { completed, failed } = await computeLatestCounters(runId);

    await Run.findByIdAndUpdate(runId, {
        completedScans: completed,
        failedScans: failed
    });

    if (await isRunFullyComplete(runId)) {
        await Run.findByIdAndUpdate(runId, {
            status: "completed",
            completedAt: new Date()
        });

        sseManager.broadcast(runId, {
            event: "done",
            runId
        });
    }
}

export async function recoverRunningRuns() {
    // Find runs that were in progress when backend shut down
    const running = await Run.find({ status: "running" }).lean();

    for (const run of running) {
        const { completed, failed, total } = await computeLatestCounters(run._id);

        // If still incomplete, restart coordinator
        if (completed + failed < total) {
            console.log(`[R1] Resuming run ${run._id}`);
            runQueue.add(async () => {
                await runCoordinator(run._id);
            });
        } else {
            // Mark completed if actually complete
            await Run.findByIdAndUpdate(run._id, {
                status: "completed",
                completedScans: completed,
                failedScans: failed,
                completedAt: new Date()
            });
        }
    }
}
