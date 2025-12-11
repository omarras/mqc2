// src/textComparison/step3_extraction/extractText.js

import * as cheerio from "cheerio";
import { extractTextFromDom } from "./extractTextFromDom.js";

/**
 * Step 3 root wrapper.
 * Accepts cleaned HTML (string),
 * loads it into cheerio,
 * then delegates DOM traversal to extractTextFromDom($).
 */
export function extractText(cleanedHtml) {
    // Create cheerio DOM instance
    const $ = cheerio.load(cleanedHtml || "", { decodeEntities: false });

    // Extract all block-level human-readable text fragments
    const blocks = extractTextFromDom($);

    // Compute word count (simple whitespace split)
    const wordCount = blocks
        .join(" ")
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .filter(Boolean).length;

    return {
        blocks,
        wordCount
    };
}
