// src/services/enqueueScan.service.js

import { Scan } from "../models/Scan.js";
import { fastQueue, slowQueue } from "./scanQueue.service.js";
import { runScanPipeline } from "../pipeline/scanPipeline.js";

export async function enqueueScan(scanId) {
    const scan = await Scan.findById(scanId).lean();
    if (!scan) throw new Error("Scan not found for enqueue");

    const hasPageData = !!scan.metadata?.pageDataCheck;

    if (!hasPageData) {
        // Phase 1 → fastQueue
        fastQueue.add(() => runScanPipeline(scan.runId, scanId));
    } else {
        // Phase 2 → slowQueue
        slowQueue.add(() => runScanPipeline(scan.runId, scanId));
    }
}
