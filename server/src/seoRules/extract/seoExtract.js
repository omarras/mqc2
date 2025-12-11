// src/seoRules/extract/seoExtract.js
import * as cheerio from "cheerio";

export function extractSeo(html, url) {
    const safeHtml = html || "";
    const $ = cheerio.load(safeHtml);

    const meta = extractMeta($);
    const og = extractOg($);

    // Locale for new URL (ContentStack) and old (AEM):
    // We only really use this for newSeo, but it is cheap to fill both.
    const localeFromMeta =
        $('meta[name="commonlocale"]').attr("content") ||
        $('meta[name="PHILIPS.CONTEXT.LOCALE"]').attr("content") ||
        "";

    return {
        htmlRaw: safeHtml,
        url: url ? new URL(url) : null,
        meta,
        og,
        h1: $("h1").first().text().trim(),
        lang: $("html").attr("lang") || "",
        dir: $("html").attr("dir") || "",
        localeTag: localeFromMeta
    };
}

function extractMeta($) {
    return {
        title: $("title").text().trim(),
        description: $('meta[name="description"]').attr("content") || "",
        canonical: $('link[rel="canonical"]').attr("href") || "",
        robots: $('meta[name="robots"]').attr("content") || ""
    };
}

function extractOg($) {
    const result = {};
    $('meta[property^="og:"]').each((i, el) => {
        const prop = $(el).attr("property");
        const content = $(el).attr("content");
        if (prop) {
            result[prop] = content;
        }
    });
    return result;
}
