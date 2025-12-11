// MQC 2.0 – Step 2 Visibility Filtering (Final Version with Global Template Removal)

import { extractDeepText } from "../helpers/textExtractors.js";

/**
 * Determine whether text content is meaningful human-readable text.
 */
function hasMeaningfulText(arr) {
    if (!arr || arr.length === 0) return false;

    return arr.some(str => {
        if (!str) return false;
        const t = String(str).trim();
        if (!t) return false;

        // Remove handlebars/templates
        if (/{{.*}}/.test(t)) return false;

        // Remove HTML-like strings
        if (t.includes("<") || t.includes(">")) return false;

        // Remove pure symbol noise
        if (/^[\W_]+$/.test(t)) return false;

        return true;
    });
}

export function applyVisibilityFiltering($, rules = {}, debug = []) {

    // ---------------------------------------------------------
    // 0. GLOBAL TEMPLATE REMOVAL
    // Remove all {{...}} or {{{...}}} placeholders BEFORE processing
    // ---------------------------------------------------------
    const html = $.html().replace(/{{[{]?(.*?)[}]?}}/gs, "");
    $.root().html(html);

    // ---------------------------------------------------------
    // 1. Build selector list
    // ---------------------------------------------------------
    const selectors = [];

    // Hidden class prefixes
    if (rules.hiddenClassPrefixes) {
        for (const prefix of rules.hiddenClassPrefixes) {
            selectors.push(`[class*="${prefix}"]`);
        }
    }

    // Exact hidden class matches
    if (rules.hiddenClassEquals) {
        for (const cls of rules.hiddenClassEquals) {
            selectors.push(`.${cls}`);
            selectors.push(`[class="${cls}"]`);
            selectors.push(`[class~="${cls}"]`);
        }
    }

    // Standard visibility attributes
    selectors.push("[hidden]");
    selectors.push('[aria-hidden="true"]');

    // Inline visibility styles
    selectors.push('[style*="display:none"]');
    selectors.push('[style*="display: none"]');
    selectors.push('[style*="visibility:hidden"]');
    selectors.push('[style*="visibility: hidden"]');
    selectors.push('[style*="opacity:0"]');
    selectors.push('[style*="opacity: 0"]');

    // ---------------------------------------------------------
    // 2. Apply visibility filters
    // ---------------------------------------------------------
    for (const selector of selectors) {
        let removedNodes = [];

        try {
            const $found = $(selector);
            $found.each((_, el) => {
                removedNodes.push(el);
                $(el).remove();
            });
        } catch {
            // ignore invalid selectors
        }

        if (removedNodes.length === 0) continue; // Your rule: skip empty entries

        // -----------------------------------------------------
        // 3. Extract clean text only
        // -----------------------------------------------------
        const cleanedTextArrays = removedNodes
            .map(node => extractDeepText($, node))
            .filter(arr => hasMeaningfulText(arr));

        // Push only meaningful debug entries
        debug.push({
            selector,
            removedCount: removedNodes.length,
            removedText: cleanedTextArrays
        });
    }
}
