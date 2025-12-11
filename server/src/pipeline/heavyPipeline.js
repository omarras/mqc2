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

function normalizeResultsForFrontend(scan, results) {
    const pd = scan.metadata.pageDataCheck || {};

    return {
        urls: {
            old: scan.urlOld,
            new: scan.urlNew
        },
        pageDataCheck: pd,

        text: results.text || null,
        links: results.links || null,
        seo: results.seo || null,

        screenshotDesktop:
            results.visualComparisonDesktop || results.screenshot || null,

        screenshotMobile:
            results.screenshotMobile || null
    };
}

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

        const steps = Object.keys(scan.checkConfig || {});

        // Execute each enabled heavy step
        for (const step of steps) {
            const enabled = scan.checkConfig[step];
            const handler = CHECK_REGISTRY[step];
            if (!enabled || !handler) continue;

            try {
                const stepResult = await handler({
                    urlOld: pd.urlOld.noCacheUrl,
                    urlNew: pd.urlNew.noCacheUrl,
                    metadata: scan.metadata,
                    pageDataCheck: pd,
                    checkConfig: scan.checkConfig,
                    scanId,
                    scanContext
                });

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
                results[step] = { error: err.message };

                await markScanFailed(scanId, err.message);
                await saveScanResults(scanId, results);

                // Reload scan for normalized output
                scan = await Scan.findById(scanId);

                sseManager.broadcast(runId, {
                    event: "row-error",
                    rowIndex: scanId.toString(),
                    message: err.message
                });

                sseManager.broadcast(runId, {
                    event: "row-final",
                    rowIndex: scanId.toString(),
                    data: normalizeResultsForFrontend(scan, results)
                });

                sseManager.broadcast(runId, {
                    event: "row-done",
                    rowIndex: scanId.toString()
                });

                return;
            }
        }

        // Completed
        await saveScanResults(scanId, results);
        await markScanCompleted(scanId);

        // Reload scan after DB updates
        scan = await Scan.findById(scanId);

        // Emit row-final
        sseManager.broadcast(runId, {
            event: "row-final",
            rowIndex: scanId.toString(),
            data: normalizeResultsForFrontend(scan, results)
        });

        // MQC1 compatibility
        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });

    } catch (err) {
        await markScanFailed(scanId, err.message);

        sseManager.broadcast(runId, {
            event: "row-error",
            rowIndex: scanId.toString(),
            message: err.message
        });

        sseManager.broadcast(runId, {
            event: "row-done",
            rowIndex: scanId.toString()
        });
    }
}
