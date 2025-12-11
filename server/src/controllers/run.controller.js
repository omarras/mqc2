// src/controllers/run.controller.js
import fetch from "node-fetch";
import { parseCSV } from "../utils/csv.js";
import * as RunService from "../services/run.service.js";
import * as ScanService from "../services/scan.service.js";
import { enqueueScan } from "../services/enqueueScan.service.js";
import { runQueue } from "../services/runQueue.service.js";
import { sseManager } from "../services/sse.service.js";
import {
    validateSingleRunBody,
    validateBulkRequest,
    validateFetchCsvBody
} from "../validators/run.validators.js";
import { createRescansForScanIds, createRerunScans } from "../services/scan.service.js";
import { computeLatestCounters } from "../services/scanLatest.service.js";
import { Run } from "../models/Run.js";
import { Scan } from "../models/Scan.js";

const PAGES_BASE_URL =
    process.env.PH_PAGES_BASE_URL ||
    "https://www.eu-west-1.api.philips.com/console/ph-pse/com-replatforming/api/pages.csv";

const DASHBOARD_BASE_URL =
    process.env.PH_DASHBOARD_BASE_URL ||
    "https://www.eu-west-1.api.philips.com/console/ph-pse/com-replatforming/d2c/pages";

/* ------------------------------------------------------------------
   UNIFIED row-start emitter with correct index for ALL run types
-------------------------------------------------------------------- */
function emitRowStart(runId, scan, rowIndex) {
    sseManager.broadcast(runId, {
        event: "row-start",
        rowIndex,
        scanId: scan._id.toString(),
        oldUrl: scan.urlOld,
        newUrl: scan.urlNew
    });
}

function isValid(url) {
    return typeof url === "string" && url.startsWith("https://");
}

function normalizeCheckConfig(rawCfg = {}) {
    return {
        text: !!rawCfg.text,
        links: !!rawCfg.links,
        seo: !!rawCfg.seo,
        visualComparisonDesktop: !!rawCfg.visualComparisonDesktop,
        screenshotMobile: !!rawCfg.screenshotMobile
    };
}

// -------------------------------------------------------------
// SINGLE
// -------------------------------------------------------------
export async function single(req, res, next) {
    try {
        const {
            urlOld,
            urlNew,
            runName,
            checkConfig
        } = validateSingleRunBody(req.body);

        const run = await RunService.createRun("single", runName);
        const runId = run._id;

        const effectiveCheckConfig = normalizeCheckConfig(checkConfig);

        const metadata = {};
        if (req.body.lastReplicationDate) {
            metadata.lastReplicationDate = new Date(req.body.lastReplicationDate);
        }

        const scan = await ScanService.createScan({
            runId,
            urlOld,
            urlNew,
            metadata,
            checkConfig: effectiveCheckConfig
        });

        await RunService.setTotals(runId, 1);

        // row-index always 0 for single mode
        emitRowStart(runId, scan, 0);

        // RUN QUEUE
        runQueue.add(async () => {
            await RunService.markRunning(runId);

            const scans = await Scan.find({ runId, deleted: false });
            for (const s of scans) {
                await enqueueScan(s._id);
            }

            await RunService.runCoordinator(runId);
        });

        res.json({ runId });
    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   BULK CSV
===================================================================== */
export async function bulk(req, res, next) {
    try {
        validateBulkRequest(req);

        const rows = parseCSV(req.file.buffer);
        const { runName } = req.body;

        let rawCfg = {};
        if (req.body.checkConfig) rawCfg = JSON.parse(req.body.checkConfig);

        const effectiveCheckConfig = normalizeCheckConfig(rawCfg);

        const run = await RunService.createRun("bulk", runName);
        const runId = run._id;

        const skipped = [];
        const scanIds = [];

        // Build scans
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const pagePath = row.pagePath?.trim();
            const preview = row.previewUrlAuto?.trim();

            if (!pagePath || pagePath === "UNKNOWN") {
                skipped.push({ row: i + 1, reason: "pagePath invalid" });
                continue;
            }
            if (!isValid(preview)) {
                skipped.push({ row: i + 1, reason: "previewUrlAuto invalid" });
                continue;
            }

            const metadata = {
                pagePath,
                contentStackUrl: row.contentStackUrl || null,
                directionFinal: row.directionFinal || null,
                directionWarning: row.directionFinal && row.directionFinal !== "Keep",
                remarksDS: row.remarksDS || null,
                approachCombined: row.approachCombined || null,
                targetTemplateCombined: row.targetTemplateCombined || null,
                lastReplicationDate: row.lastReplicationDate || null
            };

            const scan = await ScanService.createScan({
                runId,
                urlOld: pagePath,
                urlNew: preview,
                metadata,
                checkConfig: effectiveCheckConfig
            });

            scanIds.push(scan._id);
        }

        // Totals
        await RunService.setTotals(runId, scanIds.length);

        // Emit row-start for each scan with correct 0..N index
        for (let i = 0; i < scanIds.length; i++) {
            const scan = await ScanService.getById(scanIds[i]);
            emitRowStart(runId, scan, i);
        }

        // RUN QUEUE
        runQueue.add(async () => {
            await RunService.markRunning(runId);

            const scans = await Scan.find({ runId, deleted: false });
            for (const s of scans) {
                await enqueueScan(s._id);
            }

            await RunService.runCoordinator(runId);
        });

        res.json({
            runId,
            totalRows: rows.length,
            validScans: scanIds.length,
            skipped
        });
    } catch (err) {
        next(err);
    }
}

// -------------------------------------------------------------
// FETCH CSV FROM API (country + BU)
// -------------------------------------------------------------
export async function fetchCSV(req, res, next) {
    try {
        const { countryCode, businessUnit, locales, buCombined } =
            validateFetchCsvBody(req.body);

        let rawCfg = {};
        if (req.body.checkConfig) rawCfg = JSON.parse(req.body.checkConfig);
        const effectiveCheckConfig = normalizeCheckConfig(rawCfg);

        const { runName } = req.body;

        // QUERY STRING FOR SOURCE CSV
        const params = new URLSearchParams();
        params.set("directionFinal", "Keep");
        params.set("contentSourceAuto", "managed");
        params.set("statusCode", "200");
        params.set("state", "Live");
        params.set("facet", "directionFinal");
        params.set("sector", "d2c");
        params.set(
            "visibleFields",
            "pagePath|directionFinal|remarksDS|contentStackUrl|approachCombined|targetTemplateCombined|previewUrlAuto|lastReplicationDate"
        );

        buCombined.forEach(bu => params.append("buCombined", bu));
        locales.forEach(locale => params.append("locale", locale));

        const csvUrl = `${PAGES_BASE_URL}?${params.toString()}`;

        // DASHBOARD URL (identical params minus visibleFields)
        const dashParams = new URLSearchParams(params);
        dashParams.delete("visibleFields");
        const dashboardUrl = `${DASHBOARD_BASE_URL}?${dashParams.toString()}`;

        // PROD CODE
        // const response = await fetch(csvUrl);

        // DEV CODE START
        const devHeaders = {};

        if (process.env.NODE_ENV !== "production" && process.env.PHILIPS_SSO_COOKIE) {
            devHeaders["Cookie"] = process.env.PHILIPS_SSO_COOKIE;
            console.warn("[fetchCSV] Injecting SSO cookie (DEV MODE)");
        }

        const response = await fetch(csvUrl, {
            headers: devHeaders
        });

        // DEV CODE END

        if (!response.ok) {
            return res.status(502).json({
                error: true,
                message: "Failed to fetch CSV",
                status: response.status
            });
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("csv")) {
            console.error("Unexpected content type", contentType);
            return res.status(502).json({
                error: true,
                message: "Source API did not return CSV",
                contentType
            });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const rows = parseCSV(buffer);

        // Create RUN
        const run = await RunService.createRun("fetch", runName);
        const runId = run._id;

        await Run.findByIdAndUpdate(runId, {
            fetchRequest: {
                countryCode,
                businessUnit,
                locales,
                buCombined,
                requestedCsvUrl: csvUrl,
                dashboardUrl,
                timestamp: new Date()
            }
        });

        const skipped = [];
        const scanIds = [];

        // BUILD scans from CSV
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const pagePath = row.pagePath?.trim();
            const preview = row.previewUrlAuto?.trim();

            if (!pagePath || pagePath === "UNKNOWN") {
                skipped.push({ row: i + 1, reason: "pagePath invalid" });
                continue;
            }
            if (!isValid(preview)) {
                skipped.push({ row: i + 1, reason: "previewUrlAuto invalid" });
                continue;
            }

            const metadata = {
                pagePath,
                contentStackUrl: row.contentStackUrl || null,
                directionFinal: row.directionFinal || null,
                directionWarning:
                    row.directionFinal && row.directionFinal !== "Keep",
                remarksDS: row.remarksDS || null,
                approachCombined: row.approachCombined || null,
                targetTemplateCombined: row.targetTemplateCombined || null,
                lastReplicationDate: row.lastReplicationDate || null
            };

            const scan = await ScanService.createScan({
                runId,
                urlOld: pagePath,
                urlNew: preview,
                metadata,
                checkConfig: effectiveCheckConfig
            });

            scanIds.push(scan._id);
        }

        // Totals
        await RunService.setTotals(runId, scanIds.length);

        // Emit uniform row-start with correct index
        for (let i = 0; i < scanIds.length; i++) {
            const scan = await ScanService.getById(scanIds[i]);
            emitRowStart(runId, scan, i);
        }

        // RUN QUEUE
        runQueue.add(async () => {
            await RunService.markRunning(runId);

            const scans = await Scan.find({ runId, deleted: false });
            for (const s of scans) {
                await enqueueScan(s._id);
            }

            await RunService.runCoordinator(runId);
        });

        // RESPONSE
        res.json({
            runId,
            totalRows: rows.length,
            validScans: scanIds.length,
            skipped,
            source: {
                countryCode,
                businessUnit,
                locales,
                buCombined,
                requestedCsvUrl: csvUrl,
                dashboardUrl
            }
        });

    } catch (err) {
        console.error("[fetchCSV] Error", err);
        next(err);
    }
}

/* ===================================================================
   LIST RUNS
===================================================================== */
export async function list(req, res, next) {
    try {
        const runs = await RunService.listRuns();
        res.json(runs);
    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   GET RUN DETAIL
===================================================================== */
export async function get(req, res, next) {
    try {
        const run = await RunService.getRunWithLatestScans(req.params.id);

        if (!run) {
            return res.status(404).json({
                error: true,
                message: "Run not found"
            });
        }

        res.json(run);
    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   RESCAN
===================================================================== */
export async function rescan(req, res, next) {
    try {
        const runId = req.params.id;
        const { scanIds } = req.body;

        if (!Array.isArray(scanIds) || scanIds.length === 0) {
            return res.status(400).json({ error: "scanIds must be a non-empty array" });
        }

        const newScans = await createRescansForScanIds(runId, scanIds);

        return res.json({
            runId,
            rescanned: newScans.map(s => s._id)
        });

    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   RERUN
===================================================================== */
export async function rerun(req, res, next) {
    try {
        const runId = req.params.id;

        const newScans = await createRerunScans(runId);

        return res.json({
            runId,
            count: newScans.length,
            scans: newScans.map(s => s._id)
        });

    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   SSE STREAM
===================================================================== */
export function streamRun(req, res, next) {
    try {
        const runId = String(req.params.id);

        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        });

        res.flushHeaders?.();
        sseManager.addClient(runId, res);

        res.write(`event: hello\n`);
        res.write(`data: {"runId":"${runId}","connected":true}\n\n`);

        const heartbeat = setInterval(() => {
            try {
                res.write(`event: heartbeat\n`);
                res.write(`data: {}\n\n`);
            } catch (err) {
                clearInterval(heartbeat);
                sseManager.removeClient(runId, res);
                res.end();
            }
        }, 20000);

        req.on("close", () => {
            clearInterval(heartbeat);
            sseManager.removeClient(runId, res);
            res.end();
        });

    } catch (err) {
        next(err);
    }
}

/* ===================================================================
   ADD SCANS
===================================================================== */
export async function addScans(req, res, next) {
    try {
        const runId = req.params.id;
        const { scans } = req.body;

        if (!Array.isArray(scans) || scans.length === 0) {
            return res.status(400).json({ error: "scans must be a non-empty array" });
        }

        const created = [];

        for (const s of scans) {
            const newScan = await ScanService.createScan({
                runId,
                urlOld: s.urlOld,
                urlNew: s.urlNew,
                metadata: s.metadata || {},
                checkConfig: s.checkConfig || {}
            });
            created.push(newScan);
        }

        await RunService.setTotals(runId, created.length, { append: true });

        runQueue.add(async () => {
            await RunService.markRunning(runId);
            for (const s of created) {
                await enqueueScan(s._id);
            }
        });

        res.json({
            runId,
            created: created.map(s => s._id)
        });

    } catch (err) {
        next(err);
    }
}

// -------------------------------------------------------------
// UPDATE scan
// -------------------------------------------------------------
export async function updateScan(req, res, next) {
    try {
        const { runId, scanId } = req.params;

        const allowed = ["urlOld", "urlNew", "metadata", "checkConfig"];
        const updates = {};

        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const updated = await Scan.findOneAndUpdate(
            { _id: scanId, runId },
            { $set: updates },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Scan not found" });
        }

        res.json({ updated });

    } catch (err) {
        next(err);
    }
}

// -------------------------------------------------------------
// DELETE scans (soft delete)
// -------------------------------------------------------------
export async function deleteScans(req, res, next) {
    try {
        const { runId } = req.params;
        const { scanIds } = req.body;

        if (!Array.isArray(scanIds) || scanIds.length === 0) {
            return res.status(400).json({ error: "scanIds must be a non-empty array" });
        }

        await Scan.updateMany(
            { _id: { $in: scanIds }, runId },
            { $set: { deleted: true } }
        );

        const { completed, failed, total } = await computeLatestCounters(runId);

        await Run.findByIdAndUpdate(runId, {
            completedScans: completed,
            failedScans: failed,
            totalScans: total
        });

        res.json({
            runId,
            deleted: scanIds
        });

    } catch (err) {
        next(err);
    }
}

