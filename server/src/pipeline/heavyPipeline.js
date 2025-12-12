// src/pipeline/heavyPipeline.js

import { Scan } from "../models/Scan.js";
import { CHECK_REGISTRY } from "./steps/checkRegistry.js";
import {
    saveScanResults,
    markScanCompleted,
    markScanFailed,
    markScanRunning
} from "../services/scan.service.js";
import { sseManager } from "../services/sse.service.js";
import { withTimeout, StepTimeoutError } from "../utils/withTimeout.js";
import { normalizeScanForFrontend } from "../utils/scanNormalizer.js";

const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 120000);

export async function runHeavyPipeline(runId, scanId) {
    let scan = await Scan.findById(scanId);
    if (!scan) throw new Error("Scan not found");

    await markScanRunning(scanId);

    const results = {};
    const scanContext = {};

    try {
        const pd = scan.metadata?.pageDataCheck;
        if (!pd) throw new Error("Heavy phase started before pageDataCheck");

        // -------------------------------------------------------
        // 0. Determine enabled steps
        // -------------------------------------------------------
        const cfg = scan.checkConfig || {};
        const enabledSteps = Object.entries(cfg)
            .filter(([key, enabled]) => enabled && CHECK_REGISTRY[key])
            .map(([key]) => key);

        // Short circuit: no enabled steps - treat as completed
        if (enabledSteps.length === 0) {
            await saveScanResults(scanId, results);
            await markScanCompleted(scanId);

            scan = await Scan.findById(scanId);

            sseManager.broadcast(runId, {
                event: "row-final",
                rowIndex: scanId.toString(),
                data: normalizeScanForFrontend(scan)
            });

            sseManager.broadcast(runId, {
                event: "row-done",
                rowIndex: scanId.toString()
            });

            return;
        }

        // -------------------------------------------------------
        // 1. LIGHTWEIGHT HTML FETCH (ONE TIME PER URL)
        // -------------------------------------------------------
        if (!scanContext.htmlOld_http) {
            const resOld = await fetch(pd.urlOld.noCacheUrl);
            scanContext.htmlOld_http = await resOld.text();
        }

        if (!scanContext.htmlNew_http) {
            const resNew = await fetch(pd.urlNew.noCacheUrl);
            scanContext.htmlNew_http = await resNew.text();
        }

        // -------------------------------------------------------
        // 2. Execute each enabled heavy step (with timeout)
        // -------------------------------------------------------
        for (const step of enabledSteps) {
            const handler = CHECK_REGISTRY[step];
            if (!handler) continue;

            try {
                const stepResult = await withTimeout(
                    handler({
                        urlOld: pd.urlOld.noCacheUrl,
                        urlNew: pd.urlNew.noCacheUrl,
                        metadata: scan.metadata,
                        pageDataCheck: pd,
                        checkConfig: scan.checkConfig,
                        scanId,
                        scanContext
                    }),
                    CHECK_TIMEOUT_MS,
                    step
                );

                // Strip heavy HTML
                if (stepResult?.cleanedHtml) delete stepResult.cleanedHtml;
                if (stepResult?.cleaned) {
                    delete stepResult.cleaned.old;
                    delete stepResult.cleaned.new;
                }

                results[step] = stepResult;

                const MAP = {
                    text: "text-comparison",
                    links: "link-checker",
                    visualComparisonDesktop: "screenshot",
                    screenshotMobile: "screenshot-mobile",
                    seo: "seo"
                };

                const mappedKey = MAP[step] || step;

                sseManager.broadcast(runId, {
                    event: "row-result",
                    rowIndex: scanId.toString(),
                    key: mappedKey,
                    data: stepResult
                });

            } catch (err) {
                const message =
                    err instanceof StepTimeoutError
                        ? `Timeout in ${err.stepName} after ${err.timeoutMs}ms`
                        : err.message;

                results[step] = { error: message };

                await markScanFailed(scanId, message);
                await saveScanResults(scanId, results);

                // Reload scan for normalized output
                scan = await Scan.findById(scanId);

                sseManager.broadcast(runId, {
                    event: "row-error",
                    rowIndex: scanId.toString(),
                    message
                });

                sseManager.broadcast(runId, {
                    event: "row-final",
                    rowIndex: scanId.toString(),
                    data: normalizeScanForFrontend(scan)
                });

                sseManager.broadcast(runId, {
                    event: "row-done",
                    rowIndex: scanId.toString()
                });

                return;
            }
        }

        // -------------------------------------------------------
        // 3. Completed
        // -------------------------------------------------------
        await saveScanResults(scanId, results);
        await markScanCompleted(scanId);

        // Reload scan after DB updates
        scan = await Scan.findById(scanId);

        // Emit row-final
        sseManager.broadcast(runId, {
            event: "row-final",
            rowIndex: scanId.toString(),
            data: normalizeScanForFrontend(scan)
        });

        // MQC1 compatibility
        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });

    } catch (err) {
        const message =
            err instanceof StepTimeoutError
                ? `Timeout in ${err.stepName} after ${err.timeoutMs}ms`
                : err.message;

        await markScanFailed(scanId, message);

        sseManager.broadcast(runId, {
            event: "row-error",
            rowIndex: scanId.toString(),
            message
        });

        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });
    }
}
