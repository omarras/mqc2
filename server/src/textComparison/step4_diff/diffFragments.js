/**
 * STEP 4 — BLOCK / FRAGMENT LEVEL DIFF
 *
 * Goal:
 *  - Compare fragment arrays from AEM and ContentStack
 *  - Determine:
 *        equal   → exists on both sides
 *        missing → exists in AEM but not in ContentStack
 *        added   → exists in ContentStack but not in AEM
 *
 * Characteristics:
 *  - STRICT equality, no fuzzy matching
 *  - Ignores case and whitespace differences
 *  - Does NOT reorder or apply paragraph grouping
 *  - Later steps (5–6) will operate on the remainder produced here
 */

/**
 * Normalize a fragment:
 *  - trim
 *  - collapse whitespace
 *  - lowercase (strict match)
 */
function normalizeFragment(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

/**
 * Build a mapping:
 *   normalizedText → queue of indices where it appears in newFragments
 *
 * This allows consuming duplicates one-by-one.
 */
function buildIndexMap(fragments) {
    const map = new Map();

    fragments.forEach((raw, index) => {
        const norm = normalizeFragment(raw);
        if (!norm) return;

        if (!map.has(norm)) {
            map.set(norm, []);
        }
        map.get(norm).push(index);
    });

    return map;
}

/**
 * Main Step 4 Diff
 *
 * @param {string[]} oldFragments – array from AEM (Step 3 output)
 * @param {string[]} newFragments – array from ContentStack (Step 3 output)
 *
 * @returns {
 *   equals:  [{ oldIndex, newIndex, text }],
 *   missing: [{ oldIndex, text }],
 *   added:   [{ newIndex, text }]
 * }
 */
export function diffFragments(oldFragments = [], newFragments = []) {
    const equals = [];
    const missing = [];
    const added = [];

    // Build lookup map for new fragments
    const newIndexMap = buildIndexMap(newFragments);

    // STEP A — Walk old fragments
    oldFragments.forEach((rawOld, oldIndex) => {
        const normOld = normalizeFragment(rawOld);
        if (!normOld) return;

        const bucket = newIndexMap.get(normOld);

        if (bucket && bucket.length > 0) {
            const newIndex = bucket.shift();

            equals.push({
                oldIndex,
                newIndex,
                text: rawOld
            });

            if (bucket.length === 0) {
                newIndexMap.delete(normOld);
            }
        } else {
            // AEM has this, CS does not
            missing.push({
                oldIndex,
                text: rawOld
            });
        }
    });

    // STEP B — Remaining new fragments are "added"
    for (const [norm, indices] of newIndexMap.entries()) {
        indices.forEach((newIndex) => {
            added.push({
                newIndex,
                text: newFragments[newIndex]
            });
        });
    }

    return {
        equals,
        missing,
        added
    };
}
