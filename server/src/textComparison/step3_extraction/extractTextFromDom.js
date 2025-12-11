// src/textComparison/step3_extraction/extractTextFromDom.js
import { extractDeepText } from "../helpers/textExtractors.js";

export function extractTextFromDom($) {
    const results = [];

    // Select all elements that could contain visible text
    const candidates = $("body *").not("script, style, noscript");

    candidates.each((i, el) => {
        const node = $(el);

        // NEW: extractDeepText always returns an ARRAY
        const fragments = extractDeepText($, el);   // <-- FIXED

        if (!fragments || fragments.length === 0) return;

        // Join fragments into a single string
        const raw = fragments.join(" ").trim();

        if (!raw || raw.length < 1) return;

        const text = raw.replace(/\s+/g, " ");

        // Determine if this node is the lowest meaningful text container
        const isLeaf =
            node.children().length === 0 ||
            node.find("*:not(script):not(style)").length === 0;

        if (isLeaf) {
            results.push(text);
        }
    });

    return results;
}
