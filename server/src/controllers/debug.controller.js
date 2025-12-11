// src/controllers/debug.controller.js
//
// Debug endpoint for Step 1 + Step 2 + Step 3.
// NOT for production use.
// Ensures the debug output exactly matches the pipeline.
//

import * as cheerio from "cheerio";
import fetch from "node-fetch";

import { PLATFORM_EXCLUDES } from "../textComparison/step1_excludes/platformRules.js";
import { applyPlatformExcludes } from "../textComparison/step1_excludes/excludeEngine.js";

import { PLATFORM_VISIBILITY } from "../textComparison/step2_visibility/platformVisibilityRules.js";
import { applyVisibilityFiltering } from "../textComparison/step2_visibility/visibilityEngine.js";

import { extractText } from "../textComparison/step3_extraction/extractText.js";

export async function debugExcludes(req, res) {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Debug route disabled in production" });
    }

    const {
        url,
        platform = "AEM",
        htmlOverride
    } = req.body || {};

    if (!url && !htmlOverride) {
        return res.status(400).json({
            error: "Provide either `url` or `htmlOverride`"
        });
    }

    //
    // Load HTML
    //
    let html = htmlOverride || "";

    if (!htmlOverride && url) {
        try {
            const resp = await fetch(url);
            html = await resp.text();
        } catch (err) {
            return res.status(500).json({
                error: "Failed to fetch URL",
                details: err.message
            });
        }
    }

    const debugFlagsEnabled =
        process.env.DEBUG_TEXT_EXCLUDES === "true" ||
        process.env.DEBUG === "true";

    const countWords = raw =>
        (cheerio.load(raw)("body").text() || "")
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .filter(Boolean).length;

    const startingWords = countWords(html);

    //
    // STEP 1
    //
    const $step1 = cheerio.load(html, { decodeEntities: false });
    const step1Rules = PLATFORM_EXCLUDES[platform];

    if (!step1Rules) {
        return res.status(400).json({ error: `Unknown platform '${platform}'` });
    }

    const debugStep1 = [];

    applyPlatformExcludes($step1, step1Rules, debugStep1);

    const htmlAfterStep1 = $step1.html() || "";
    const afterStep1Words = countWords(htmlAfterStep1);

    //
    // STEP 2
    //
    const $step2 = cheerio.load(htmlAfterStep1, { decodeEntities: false });
    const visibilityRules = PLATFORM_VISIBILITY[platform] || {};

    const debugStep2 = [];

    applyVisibilityFiltering($step2, visibilityRules, debugStep2);

    const htmlAfterStep2 = $step2.html() || "";
    const afterStep2Words = countWords(htmlAfterStep2);

    //
    // STEP 3 — FINAL TEXT EXTRACTION
    //
    const step3 = extractText(htmlAfterStep2);

    //
    // Response
    //
    return res.json({
        platform,
        url: url || null,

        words: {
            starting: startingWords,
            afterStep1: afterStep1Words,
            afterStep2: afterStep2Words,
            afterStep3: step3.wordCount
        },

        step1: {
            rules: step1Rules.length,
            debug: debugStep1
        },

        step2: {
            visibilityRules,
            debug: debugStep2
        },

        step3: {
            blocks: step3.blocks,
            blockCount: step3.blocks.length,
            wordCount: step3.wordCount
        },

        cleanedLength: htmlAfterStep2.length,
        cleanedHtml: process.env.DEBUG === "true" ? htmlAfterStep2 : undefined
    });
}
