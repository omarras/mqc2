// src/pipeline/scanPipeline.js

import { Scan } from "../models/Scan.js";
import { runPageDataPipeline } from "./pageDataPipeline.js";
import { runHeavyPipeline } from "./heavyPipeline.js";

export async function runScanPipeline(runId, scanId) {
    const scan = await Scan.findById(scanId).lean();
    if (!scan) throw new Error("Scan not found");

    const hasPD = !!scan.metadata?.pageDataCheck;

    if (!hasPD) {
        // Phase 1
        return runPageDataPipeline(runId, scanId);
    }

    // Phase 2
    return runHeavyPipeline(runId, scanId);
}

