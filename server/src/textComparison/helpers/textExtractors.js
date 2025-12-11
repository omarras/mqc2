import * as cheerio from "cheerio";

/**
 * Determine if a string is meaningful human-facing text.
 */
export function isMeaningfulHumanText(str) {
    if (!str) return false;

    const s = str.trim();
    if (!s) return false;

    // Allow pure numbers (prices, codes, etc)
    if (/^\d+([.,]\d+)?$/.test(s)) {
        return true;
    }

    // Reject JSON-like technical strings
    if (/\"[a-zA-Z0-9_-]+\"\s*:/.test(s)) return false;

    // Reject typical JS fragments
    if (/(function|var|let|const|=>|querySelector|document|forEach)/i.test(s)) {
        return false;
    }

    // Reject strange punctuation sequences or machine noise
    if (/[:{}[\]()=<>]/.test(s) && !/[a-zA-Z]/.test(s)) {
        return false;
    }

    // Very long machine-like text with no human sentence structure
    if (s.length > 300 && !/[.!?]/.test(s)) {
        return false;
    }

    // Human text normally contains vowels. If none found,
    // but there are weird characters, reject it.
    if (!/[aeiouáéíóúäëïöüàèìòù]/i.test(s)) {
        if (/[^a-zA-Z0-9\s.,%-]/.test(s)) {
            return false;
        }
    }

    return true;
}

/**
 * Extracts text content from semantic nodes only.
 */
export function extractDeepText($, root) {
    if (!root) return [];

    const result = [];

    function walk(node) {
        if (!node) return;

        if (node.type === "text") {
            const txt = node.data.trim();
            if (txt) result.push(txt);
        }

        if (node.children && node.children.length > 0) {
            for (const c of node.children) walk(c);
        }
    }

    walk(root);

    // Final cleanup: remove garbage, keep meaningful text only.
    return result.filter(isMeaningfulHumanText);
}
