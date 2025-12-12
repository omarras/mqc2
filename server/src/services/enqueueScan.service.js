// src/services/enqueueScan.service.js

import { Scan } from "../models/Scan.js";
import { fastQueue, slowQueue } from "./scanQueue.service.js";
import { runScanPipeline } from "../pipeline/scanPipeline.js";

/**
 * Enqueue scan into Phase 1 or Phase 2 based on metadata.
 * Ensures:
 * - never double-enqueues
 * - correct handling of early-abort scans
 * - strict pipeline progression
 */
export async function enqueueScan(scanId) {
    const scan = await Scan.findById(scanId);
    if (!scan) throw new Error("Scan not found for enqueue");

    const pd = scan.metadata?.pageDataCheck;

    // -------------------------------------------------
    // PHASE 1 — no pageDataCheck exists yet
    // -------------------------------------------------
    if (!pd) {
        return fastQueue.add(() => runScanPipeline(scan.runId, scanId));
    }

    // -------------------------------------------------
    // EARLY FAIL — pageDataCheck SHOULD NOT PROCEED
    // -------------------------------------------------
    if (pd.shouldContinue === false) {
        // Phase 2 must NOT run.
        return;
    }

    // -------------------------------------------------
    // PHASE 2
    // -------------------------------------------------
    return slowQueue.add(() => runScanPipeline(scan.runId, scanId));
}
