// src/pipeline/steps/pageDataCheck.js
import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { withNoCacheParam } from "../../shared/url-utils.js";

async function fetchPageInfo(url) {
    const TIMEOUT_MS = 15000;

    let response;
    let html = "";
    let httpStatus = 0;
    let httpStatusText = "";
    let error = null;
    const start = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        response = await fetch(url, {
            signal: controller.signal,
            redirect: "manual"
        });

        clearTimeout(timeout);

        httpStatus = response.status;
        httpStatusText = response.statusText;

        if (httpStatus === 200) {
            html = await response.text();
        }

    } catch (err) {
        error = err.name === "AbortError" ? "TIMEOUT" : err.message;
        return {
            httpStatus: 0,
            httpStatusText: "Timeout",
            durationMs: Date.now() - start,
            error,
            platform: "UNKNOWN",
            html: ""
        };
    }

    const durationMs = Date.now() - start;

    let platform = "UNKNOWN";
    if (html.includes("clientlibs/foundation-base")) platform = "AEM";
    if (html.includes("c-resources/_next")) platform = "ContentStack";

    return {
        httpStatus,
        httpStatusText,
        durationMs,
        error: null,
        platform,
        html
    };
}

export async function pageDataCheck({ urlOld, urlNew, scanContext }) {
    const ts = Date.now();
    const urlOldNoCache = withNoCacheParam(urlOld, ts);
    const urlNewNoCache = withNoCacheParam(urlNew, ts);

    const [oldResult, newResult] = await Promise.all([
        fetchPageInfo(urlOldNoCache),
        fetchPageInfo(urlNewNoCache)
    ]);

    const shouldContinue =
        oldResult.httpStatus === 200 && newResult.httpStatus === 200;

    // Capture HTML ONLY IN MEMORY
    scanContext.htmlOld = oldResult.html || "";
    scanContext.htmlNew = newResult.html || "";

    //
    // LIGHTWEIGHT METADATA ONLY (no HTML)
    //
    let title = "UNKNOWN";
    let locale = "UNKNOWN";
    let languageCode = "UNKNOWN";
    let countryCode = "UNKNOWN";
    let country = "UNKNOWN";
    let language = "UNKNOWN";

    if (shouldContinue && newResult.html) {
        const $ = cheerio.load(newResult.html);

        const rawTitle = $("title").first().text().trim();
        if (rawTitle) title = rawTitle;

        locale = $("meta[name='commonlocale']").attr("content") || "UNKNOWN";

        if (locale.includes("_")) {
            const [lang, cc] = locale.split("_");
            languageCode = lang;
            countryCode = cc;
        }

        const foot = $("div[data-testid='footer-country-selector'] a");
        if (foot.length > 0) {
            const text = foot.first().text().trim();
            const parts = text.split("/").map(x => x.trim());
            if (parts.length === 2) {
                country = parts[0];
                language = parts[1];
            }
        }
    }

    //
    // MINIMAL METADATA STRUCTURE (public-safe)
    //
    const publicMetadata = {
        urlOld: {
            originalUrl: urlOld,
            noCacheUrl: urlOldNoCache,
            httpStatus: oldResult.httpStatus,
            httpStatusText: oldResult.httpStatusText,
            durationMs: oldResult.durationMs,
            error: oldResult.error,
            platform: oldResult.platform
        },
        urlNew: {
            originalUrl: urlNew,
            noCacheUrl: urlNewNoCache,
            httpStatus: newResult.httpStatus,
            httpStatusText: newResult.httpStatusText,
            durationMs: newResult.durationMs,
            error: newResult.error,
            platform: newResult.platform,
            title,
            locale,
            languageCode,
            countryCode,
            country,
            language
        },
        shouldContinue
    };

    return { publicMetadata, shouldContinue };
}
