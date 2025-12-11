// src/services/run.service.js

import { Run } from "../models/Run.js";
import { Scan } from "../models/Scan.js";
import { getLatestScansForRun } from "./scanLatest.service.js";
import { fastQueue, slowQueue } from "./scanQueue.service.js";
import { enqueueScan } from "./enqueueScan.service.js";
import { sseManager } from "./sse.service.js";
import { computeLatestCounters, isRunFullyComplete } from "./scanLatest.service.js";

/**
 * Create a new run.
 */
export async function createRun(type, runName, runNameAuto = null) {
    return Run.create({
        type,
        runName,
        runNameAuto: runNameAuto || `run-${Date.now()}`,
        status: "pending",
        totalScans: 0,
        completedScans: 0,
        failedScans: 0
    });
}

/**
 * Add scans to a Run.
 */
export async function addScansToRun(runId, scanIds) {
    return Run.findByIdAndUpdate(
        runId,
        { $push: { scans: { $each: scanIds } } },
        { new: true }
    );
}

/**
 * Updated: returns run + LATEST scans ONLY.
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

/**
 * For debugging: all scans (full history).
 */
export async function getRunWithAllScans(id) {
    const run = await Run.findById(id).lean();
    if (!run) return null;

    const scans = await Scan.find({ runId: id });
    return { ...run, scans };
}

/**
 * List runs (unchanged).
 */
export async function listRuns() {
    return Run.find().sort({ createdAt: -1 });
}

/**
 * Sets the baseline total (unchanged).
 */
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

export async function runCoordinator(runId) {

    // ---------------------------------------------------------
    // 1. WAIT FOR PHASE 1 (fastQueue) TO FINISH
    // ---------------------------------------------------------
    await fastQueue.onIdle();

    // Ensure all scans have pageDataCheck
    const scans = await Scan.find({ runId, deleted: false });
    const pendingPD = scans.filter(s => !s.metadata?.pageDataCheck);

    if (pendingPD.length > 0) {
        // Should never happen, but safe guard:
        console.error("[runCoordinator] Some scans missing pageDataCheck");
    }

    // ---------------------------------------------------------
    // 2. ENQUEUE PHASE 2 for scans that shouldContinue === true
    // ---------------------------------------------------------
    const validScans = scans.filter(s => {
        const pd = s.metadata?.pageDataCheck;
        return pd && pd.shouldContinue !== false; // avoid undefined safety
    });

    for (const scan of validScans) {
        await enqueueScan(scan._id); // Goes to slowQueue
    }

    // ---------------------------------------------------------
    // 3. WAIT FOR PHASE 2 (slowQueue) TO FINISH
    // ---------------------------------------------------------
    await slowQueue.onIdle();

    // ---------------------------------------------------------
    // 4. EVALUATE RUN COMPLETION
    // ---------------------------------------------------------
    const { completed, failed, total } = await computeLatestCounters(runId);

    await Run.findByIdAndUpdate(runId, {
        completedScans: completed,
        failedScans: failed
    });

    if (await isRunFullyComplete(runId)) {
        await Run.findByIdAndUpdate(runId, {
            status: "completed",
            completedAt: new Date()
        });

        // Final SSE
        sseManager.broadcast(runId, {
            event: "done",
            runId
        });
    }
}
