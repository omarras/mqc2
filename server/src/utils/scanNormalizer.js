// src/utils/scanNormalizer.js

/**
 * Normalize a raw DB Scan document into the MQC2 frontend ViewModel shape.
 *
 * Target shape = SSE `row-final.data`:
 *  {
 *    _id, scanId,
 *    urlOld, urlNew,
 *    urls: { old, new },        // extra convenience for the table
 *    status, phase,
 *    text,                      // full text step result
 *    seo,                       // full seo step result
 *    links,                     // full links step result
 *    screenshots: { desktop, mobile },
 *    pageDataCheck,
 *    metadata
 *  }
 */

export function normalizeScanForFrontend(scan) {
    if (!scan) return null;

    const results = scan.results || scan.checkResults || {};
    const metadata = scan.metadata || {};
    const pageData = scan.pageDataCheck || metadata.pageDataCheck || null;

    // URLs: prefer explicit string fields, then fall back to pageDataCheck
    const urlOld =
        scan.urlOld ||
        pageData?.urlOld?.originalUrl ||
        null;

    const urlNew =
        scan.urlNew ||
        pageData?.urlNew?.originalUrl ||
        null;

    // TEXT
    // New runs should have results.text or results["text-comparison"].
    // Old runs may have scan.text already in final shape.
    const text =
        results.text ||
        results["text-comparison"] ||
        scan.text ||
        null;

    // SEO
    // New runs: results.seo (full object with rules/errors/summary).
    // Old runs: scan.seo may already be normalized.
    const seo =
        results.seo ||
        scan.seo ||
        null;

    // LINKS
    // New runs: results.links or results["link-checker"].
    // Old runs: scan.links may be { items, brokenCount, totalCount }.
    const links =
        results.links ||
        results["link-checker"] ||
        scan.links ||
        null;

    // SCREENSHOTS
    // New runs: results.visualComparisonDesktop & results.screenshotMobile.
    // Old runs: scan.screenshots.desktop / mobile already present.
    const desktopScreenshots =
        results.visualComparisonDesktop ||
        scan.screenshots?.desktop ||
        null;

    const mobileScreenshots =
        results.screenshotMobile ||
        scan.screenshots?.mobile ||
        null;

    return {
        _id: scan._id,
        scanId: scan._id?.toString?.() || scan._id,

        // URLs (strings)
        urlOld,
        urlNew,

        // Convenience shape for table (what row-update SSE creates)
        urls: {
            old: urlOld,
            new: urlNew
        },

        // Pipeline status
        status: scan.status || null,
        phase: scan.phase || null,

        // Step results – mirror SSE row-final
        text,
        seo,
        links,

        screenshots: {
            desktop: desktopScreenshots,
            mobile: mobileScreenshots
        },

        // Phase 1 data
        pageDataCheck: pageData,

        // Keep metadata, but ensure pageDataCheck is inside as well
        metadata: {
            ...metadata,
            pageDataCheck: pageData || metadata.pageDataCheck
        }
    };
}

/**
 * Normalize an array of scans.
 */
export function normalizeMany(scans = []) {
    return scans.map(normalizeScanForFrontend);
}
