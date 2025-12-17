// src/utils/scanNormalizer.js

function normStr(v) {
    return String(v ?? "").trim();
}

function mapDsToUat(dsStatusRaw) {
    const raw = normStr(dsStatusRaw);
    const key = raw.toLowerCase();

    if (!raw) {
        return {
            dsStatusRaw: null,
            uatStatus: "unknown",      // no DS status present
            uatMismatch: false,
            uatExpectedStartOk: false
        };
    }

    // Your 3 UAT workflow states
    if (key === "ready for uat") {
        return {
            dsStatusRaw: raw,
            uatStatus: "ready",
            uatMismatch: false,
            uatExpectedStartOk: true
        };
    }

    if (key === "uat feedback provided") {
        return {
            dsStatusRaw: raw,
            uatStatus: "feedback",
            uatMismatch: false,
            uatExpectedStartOk: false
        };
    }

    if (key === "uat approved") {
        return {
            dsStatusRaw: raw,
            uatStatus: "approved",
            uatMismatch: false,
            uatExpectedStartOk: false
        };
    }

    // Everything else is allowed to exist, but is a mismatch to the expectation
    return {
        dsStatusRaw: raw,
        uatStatus: "other",
        uatMismatch: true,
        uatExpectedStartOk: false
    };
}

export function normalizeScanForFrontend(scan) {
    if (!scan) return null;

    const results = scan.results || scan.checkResults || {};
    const metadata = scan.metadata || {};
    const pageData = scan.pageDataCheck || metadata.pageDataCheck || null;

    const urlOld = scan.urlOld || pageData?.urlOld?.originalUrl || null;
    const urlNew = scan.urlNew || pageData?.urlNew?.originalUrl || null;

    const text = results.text || results["text-comparison"] || scan.text || null;
    const seo = results.seo || scan.seo || null;
    const links = results.links || results["link-checker"] || scan.links || null;

    const desktopScreenshots =
        results.visualComparisonDesktop || scan.screenshots?.desktop || null;
    const mobileScreenshots =
        results.screenshotMobile || scan.screenshots?.mobile || null;

    // ✅ ALWAYS derive DS info from metadata.dsStatus (single source of truth)
    const dsInfo = mapDsToUat(metadata.dsStatus);

    return {
        _id: scan._id,
        scanId: scan._id?.toString?.() || scan._id,

        urlOld,
        urlNew,

        urls: { old: urlOld, new: urlNew },

        status: scan.status || null,
        phase: scan.phase || null,

        text,
        seo,
        links,

        screenshots: {
            desktop: desktopScreenshots,
            mobile: mobileScreenshots
        },

        pageDataCheck: pageData,

        // ✅ Derived DS info (NEVER persisted, NEVER cached)
        dsInfo,

        metadata: {
            ...metadata,
            pageDataCheck: pageData || metadata.pageDataCheck
        }
    };
}

export function normalizeMany(scans = []) {
    return scans.map(normalizeScanForFrontend);
}
