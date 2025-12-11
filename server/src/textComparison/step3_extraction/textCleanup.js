// src/textComparison/step3_extraction/textCleanup.js

// Regex to remove all mustache/mustache-like template placeholders
const MUSTACHE_REGEX = /{{[{]?(.*?)[}]?}}/gs;

/**
 * Normalize each block:
 * - remove template placeholders
 * - trim
 * - collapse whitespace
 */
function cleanBlock(str) {
    if (!str) return "";

    return str
        .replace(MUSTACHE_REGEX, "")        // remove templates
        .replace(/<[^>]+>/g, "")            // remove any leftover HTML (fail-safe)
        .replace(/\s+/g, " ")               // collapse whitespace
        .trim();
}

/**
 * Clean an array of extracted text blocks.
 * Removes empty, duplicate, or garbage items.
 */
export function cleanTextArray(blocks = []) {
    const cleaned = [];

    for (let b of blocks) {
        const text = cleanBlock(b);
        if (!text) continue;

        // Skip 1-character noise
        if (text.length < 2) continue;

        cleaned.push(text);
    }

    // Remove duplicates while preserving original order
    return [...new Set(cleaned)];
}
