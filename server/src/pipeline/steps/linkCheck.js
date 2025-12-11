// server/src/pipeline/steps/linkCheck.js
//
// MQC 2.0 LINK CHECKER (Updated Version)
//
// NEW FEATURES ADDED:
// ----------------------------------------------------
// - outcome: "success" | "warning" | "error"
// - backend decides outcome (frontend does ZERO logic)
// - internal/external classification
// - exposes initial + final status
// - exposes redirected, redirectChain, secure
// - score still computed but only used for meters
//
// Weighted scoring rules:
//   perfect (200, https, no redirect):             → 1.0
//   redirected OR insecure (http):                 → 0.5
//   redirected AND insecure:                       → 0.25
//   error/no finalStatus/ >=400:                   → 0.0
//
// outcome mapping:
//   score === 1.0     → "success"
//   score === 0.5     → "warning"
//   score === 0 or .25 → "error"
// ----------------------------------------------------

import * as cheerio from "cheerio";
import { applyPlatformExcludes } from "../../textComparison/step1_excludes/excludeEngine.js";
import { PLATFORM_EXCLUDES } from "../../textComparison/step1_excludes/platformRules.js";

/**
 * Classify link type.
 */
function classifyType(url, baseDomain) {
    try {
        const u = new URL(url);
        return u.hostname === baseDomain ? "internal" : "external";
    } catch {
        return "external";
    }
}

/**
 * GET-only fetch with redirect tracking.
 */
async function probeUrl(url, maxRedirects = 10) {
    let currentUrl = url;
    let redirectChain = [];
    let initialStatus = null;
    let finalStatus = null;

    try {
        for (let i = 0; i < maxRedirects; i++) {
            const res = await fetch(currentUrl, { redirect: "manual" });

            if (initialStatus === null) initialStatus = res.status;

            const isRedirect = res.status >= 300 && res.status < 400;

            if (!isRedirect) {
                finalStatus = res.status;
                return {
                    url,
                    initialStatus,
                    finalStatus,
                    finalUrl: currentUrl,
                    redirected: redirectChain.length > 0,
                    redirectChain,
                    secure: currentUrl.startsWith("https://"),
                    error: null
                };
            }

            // Redirect
            const location = res.headers.get("location");
            if (!location) {
                return {
                    url,
                    initialStatus,
                    finalStatus: res.status,
                    finalUrl: currentUrl,
                    redirected: redirectChain.length > 0,
                    redirectChain,
                    secure: currentUrl.startsWith("https://"),
                    error: "redirect-missing-location"
                };
            }

            redirectChain.push({ status: res.status, location });

            try {
                currentUrl = new URL(location, currentUrl).toString();
            } catch {
                return {
                    url,
                    initialStatus,
                    finalStatus: res.status,
                    finalUrl: currentUrl,
                    redirected: redirectChain.length > 0,
                    redirectChain,
                    secure: currentUrl.startsWith("https://"),
                    error: "invalid-redirect-url"
                };
            }
        }

        return {
            url,
            initialStatus,
            finalStatus: null,
            finalUrl: currentUrl,
            redirected: true,
            redirectChain,
            secure: currentUrl.startsWith("https://"),
            error: "max-redirects-exceeded"
        };

    } catch (err) {
        return {
            url,
            initialStatus,
            finalStatus: null,
            finalUrl: currentUrl,
            redirected: redirectChain.length > 0,
            redirectChain,
            secure: currentUrl.startsWith("https://"),
            error: err.message || "network-error"
        };
    }
}

/**
 * Weighted scoring.
 */
function computeWeightedScore(r) {
    if (r.error || !r.finalStatus || r.finalStatus >= 400) return 0.0;

    const insecure = !r.secure;

    if (r.finalStatus === 200 && !r.redirected && !insecure) return 1.0;
    if (r.redirected && insecure) return 0.25;
    if (r.redirected || insecure) return 0.5;

    return 1.0;
}

/**
 * Convert weighted score → outcome.
 */
function determineOutcome(score) {
    if (score === 1.0) return "success";
    if (score === 0.5) return "warning";
    return "error"; // covers 0.25 and 0
}

/**
 * Extract <a href> links from cleaned HTML.
 */
function extractLinks(html, platform) {
    const $ = cheerio.load(html, { decodeEntities: false });

    applyPlatformExcludes($, PLATFORM_EXCLUDES[platform]);
    $("script, style, noscript, svg, nav, header, footer, aside, template").remove();

    const set = new Set();

    $("a[href]").each((i, el) => {
        let href = $(el).attr("href")?.trim();
        if (!href) return;

        if (
            href.startsWith("#") ||
            href.startsWith("javascript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("sms:") ||
            href.startsWith("data:")
        ) return;

        set.add(href);
    });

    return [...set];
}

/**
 * Main MQC2 pipeline step: linkCheck
 */
export async function linkCheck({ scanContext, metadata }) {
    const pd = metadata?.pageDataCheck;
    if (!pd) {
        return {
            status: "error",
            error: "linkCheck: pageDataCheck metadata missing"
        };
    }

    const cleanedOld = scanContext.cleanedOldHtml || "";
    const cleanedNew = scanContext.cleanedNewHtml || "";

    const oldLinks = extractLinks(cleanedOld, "AEM");
    const newLinks = extractLinks(cleanedNew, "ContentStack");

    /**
     * Check multiple links.
     */
    async function checkMany(links) {
        const results = [];
        const baseDomain = new URL(pd.urlNew.originalUrl).hostname;

        for (const href of links) {
            let finalUrl = href;

            if (href.startsWith("//")) {
                finalUrl = "https:" + href;
            } else if (!href.startsWith("http")) {
                finalUrl = new URL(href, pd.urlNew.originalUrl).toString();
            }

            const r = await probeUrl(finalUrl);

            r.type = classifyType(r.finalUrl || r.url, baseDomain);

            r.score = computeWeightedScore(r);

            r.outcome = determineOutcome(r.score);

            results.push(r);
        }

        return results;
    }

    const oldResults = await checkMany(oldLinks);
    const newResults = await checkMany(newLinks);

    const filterIssues = arr =>
        arr.filter(r => r.outcome !== "success");

    const avg = arr =>
        arr.length === 0 ? 1.0 : arr.reduce((sum, x) => sum + x.score, 0) / arr.length;

    const oldScoreVal = avg(oldResults);
    const newScoreVal = avg(newResults);
    const deltaVal = newScoreVal - oldScoreVal;

    let verdict = "no-change";
    if (deltaVal > 0) verdict = "improvement";
    else if (deltaVal < 0) verdict = "regression";

    return {
        status: "ok",

        old: {
            totalLinks: oldLinks.length,
            score: oldScoreVal,
            allLinks: oldResults,
            errors: filterIssues(oldResults)
        },

        new: {
            totalLinks: newLinks.length,
            score: newScoreVal,
            allLinks: newResults,
            errors: filterIssues(newResults)
        },

        summary: {
            oldScore: oldScoreVal,
            newScore: newScoreVal,
            delta: deltaVal,
            verdict
        }
    };
}
