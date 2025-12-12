// src/pipeline/pageDataPipeline.js

import { Scan } from "../models/Scan.js";
import { pageDataCheck } from "./steps/pageDataCheck.js";
import {
    markScanRunning,
    markScanFailed,
    saveScanResults
} from "../services/scan.service.js";
import { sseManager } from "../services/sse.service.js";
import { withTimeout, StepTimeoutError } from "../utils/withTimeout.js";
import { normalizeScanForFrontend } from "../utils/scanNormalizer.js";

const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 120000);

export async function runPageDataPipeline(runId, scanId) {
    let scan = await Scan.findById(scanId);
    if (!scan) throw new Error("Scan not found");

    // Mark running (Phase 1)
    await markScanRunning(scanId);

    const scanContext = {};

    try {
        // -------------------------------------------
        // 1. PAGE DATA CHECK ONLY (with timeout)
        // -------------------------------------------
        const pdResult = await withTimeout(
            pageDataCheck({
                urlOld: scan.urlOld,
                urlNew: scan.urlNew,
                scanContext
            }),
            CHECK_TIMEOUT_MS,
            "pageDataCheck"
        );

        // Save metadata
        scan.metadata = {
            ...scan.metadata,
            pageDataCheck: pdResult.publicMetadata
        };
        await scan.save();

        // Notify frontend
        sseManager.broadcast(runId, {
            event: "row-update",
            rowIndex: scanId.toString(),
            key: "pageDataCheck",
            data: pdResult.publicMetadata
        });

        // Abort scenario: shouldContinue = false
        if (!pdResult.shouldContinue) {
            const msg = `pageDataCheck aborted: old=${pdResult.publicMetadata.urlOld.httpStatus}, new=${pdResult.publicMetadata.urlNew.httpStatus}`;

            await markScanFailed(scanId, msg);
            await saveScanResults(scanId, { pageDataCheck: pdResult.publicMetadata });

            // Minimal MQC2 final payload
            const finalPayload = {
                urls: {
                    old: scan.urlOld,
                    new: scan.urlNew
                },
                pageDataCheck: pdResult.publicMetadata,
                text: null,
                links: null,
                seo: null,
                screenshotDesktop: null,
                screenshotMobile: null
            };

            // Emit final normalized result
            sseManager.broadcast(runId, {
                event: "row-final",
                rowIndex: scanId.toString(),
                data: finalPayload
            });

            // MQC1 compatibility
            sseManager.broadcast(runId, {
                event: "row-error",
                rowIndex: scanId.toString(),
                message: msg
            });

            sseManager.broadcast(runId, {
                event: "row-done",
                rowIndex: scanId.toString()
            });

            return;
        }

        // Success: Phase 1 complete - no final result yet
        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });

    } catch (err) {
        // Fatal error in Phase 1 (including timeout)
        const message =
            err instanceof StepTimeoutError
                ? `Timeout in ${err.stepName} after ${err.timeoutMs}ms`
                : err.message;

        await markScanFailed(scanId, message);

        // Reload once, in case metadata was partially written
        scan = await Scan.findById(scanId);

        sseManager.broadcast(runId, {
            event: "row-error",
            rowIndex: scanId.toString(),
            message
        });

        sseManager.broadcast(runId, {
            event: "row-final",
            rowIndex: scanId.toString(),
            data: normalizeScanForFrontend(await Scan.findById(scanId))
        });

        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });
    }
}
