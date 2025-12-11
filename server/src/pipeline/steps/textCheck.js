//
// STEP 1 + STEP 2 + STEP 3 + STEP 4 + STEP 6 + STEP 7 + STEP 9 (NORMALIZED OPS)
//

import * as cheerio from "cheerio";

import { PLATFORM_EXCLUDES } from "../../textComparison/step1_excludes/platformRules.js";
import { applyPlatformExcludes } from "../../textComparison/step1_excludes/excludeEngine.js";

import { PLATFORM_VISIBILITY } from "../../textComparison/step2_visibility/platformVisibilityRules.js";
import { applyVisibilityFiltering } from "../../textComparison/step2_visibility/visibilityEngine.js";

import { extractText } from "../../textComparison/step3_extraction/extractText.js";
import { diffFragments } from "../../textComparison/step4_diff/diffFragments.js";

import { WordDiff } from "../../textComparison/step6_wordDiff/wordSimilarity.js";

import { computeContentParity } from "../../textComparison/step7_contentParity/computeContentParity.js";

export async function textCheck({ scanContext }) {
    try {
        //
        // ------------------------------------------------------------
        // 1. RAW HTML INPUT
        // ------------------------------------------------------------
        //
        const originalOldHtml =
            scanContext.htmlOld_playwright ||  // JS-rendered DOM (preferred if exists)
            scanContext.htmlOld_http ||        // lightweight static HTML (fallback)
            "";

        const originalNewHtml =
            scanContext.htmlNew_playwright ||
            scanContext.htmlNew_http ||
            "";

        // Hard fail if HTML missing (prevents silent empty diffs)
        if (!originalOldHtml || !originalNewHtml) {
            throw new Error("TextCheck requires HTML but none was provided in scanContext.");
        }

        //
        // ------------------------------------------------------------
        // 2. WORD COUNT (raw HTML)
        // ------------------------------------------------------------
        //
        const countWords = html =>
            (cheerio.load(html)("body").text() || "")
                .trim()
                .replace(/\s+/g, " ")
                .split(" ")
                .filter(Boolean).length;

        //
        // ------------------------------------------------------------
        // 3. STEP 1 — PLATFORM EXCLUDES
        // ------------------------------------------------------------
        //
        const $oldStep1 = cheerio.load(originalOldHtml, { decodeEntities: false });
        const $newStep1 = cheerio.load(originalNewHtml, { decodeEntities: false });

        applyPlatformExcludes($oldStep1, PLATFORM_EXCLUDES.AEM);
        applyPlatformExcludes($newStep1, PLATFORM_EXCLUDES.ContentStack);

        const step1OldHtml = $oldStep1.html() || "";
        const step1NewHtml = $newStep1.html() || "";

        //
        // ------------------------------------------------------------
        // 4. STEP 2 — VISIBILITY FILTERING
        // ------------------------------------------------------------
        //
        const $oldStep2 = cheerio.load(step1OldHtml, { decodeEntities: false });
        const $newStep2 = cheerio.load(step1NewHtml, { decodeEntities: false });

        const debugCollectorOld = [];
        const debugCollectorNew = [];

        applyVisibilityFiltering($oldStep2, PLATFORM_VISIBILITY.AEM, debugCollectorOld);
        applyVisibilityFiltering($newStep2, PLATFORM_VISIBILITY.ContentStack, debugCollectorNew);

        const step2OldHtml = $oldStep2.html() || "";
        const step2NewHtml = $newStep2.html() || "";

        //
        // Store CLEAN HTML for Step 3
        //
        scanContext.cleanedOldHtml = step2OldHtml;
        scanContext.cleanedNewHtml = step2NewHtml;

        //
        // ------------------------------------------------------------
        // 5. STEP 3 — FINAL TEXT EXTRACTION (BLOCKS)
        // ------------------------------------------------------------
        //
        const step3Old = extractText(step2OldHtml);
        const step3New = extractText(step2NewHtml);

        const oldFragments = step3Old.blocks;
        const newFragments = step3New.blocks;

        scanContext.step3 = { old: step3Old, new: step3New };

        //
        // ------------------------------------------------------------
        // 6. STEP 4 — EXACT FRAGMENT DIFF
        // ------------------------------------------------------------
        //
        const diffStep4 = diffFragments(oldFragments, newFragments);
        scanContext.diffStep4 = diffStep4;

        //
        // ------------------------------------------------------------
        // 7. STEP 6 — SIMILARITY DIFF (80%)
        // ------------------------------------------------------------
        //
        const diffStep6 = WordDiff(
            diffStep4.missing,
            diffStep4.added,
            {
                threshold: 0.80,
                minWords: 3
            }
        );

        scanContext.diffStep6 = diffStep6;

        //
        // ------------------------------------------------------------
        // 8. MERGE STEP 4 + STEP 6 INTO FINAL EQUALS / MISSING / ADDED
        // ------------------------------------------------------------
        //

        const finalEquals = [
            ...diffStep4.equals.map(e => ({
                type: "exact",
                oldIndex: e.oldIndex,
                newIndex: e.newIndex,
                text: e.text
            })),
            ...diffStep6.newEquals.map(e => ({
                type: "similar",
                oldIndex: e.oldIndex,
                newIndex: e.newIndex,
                similarity: e.similarity,
                equalText: e.equalText,
                missingWords: e.missingWords,
                addedWords: e.addedWords
            }))
        ];

        const finalMissing = [
            ...diffStep6.finalMissing.map(m => ({
                oldIndex: m.oldIndex,
                text: m.text
            })),
            ...diffStep6.newEquals
                .filter(e => e.missingWords && e.missingWords.trim().length > 0)
                .map(e => ({
                    oldIndex: e.oldIndex,
                    text: e.missingWords
                }))
        ];

        const finalAdded = [
            ...diffStep6.finalAdded.map(a => ({
                newIndex: a.newIndex,
                text: a.text
            })),
            ...diffStep6.newEquals
                .filter(e => e.addedWords && e.addedWords.trim().length > 0)
                .map(e => ({
                    newIndex: e.newIndex,
                    text: e.addedWords
                }))
        ];

        scanContext.finalTextDiff = {
            equals: finalEquals,
            missing: finalMissing,
            added: finalAdded
        };

        //
        // ------------------------------------------------------------
        // 9. STEP 9 — NORMALIZE INTO FLAT, ORDERED OPS ARRAY
        // ------------------------------------------------------------
        //

        const normalizedOps = [];

        //
        // EQUALS (exact + similar)
        //
        for (const eq of finalEquals) {

            let textOldRaw = null;
            let textNewRaw = null;

            // Pull exact raw fragment text (even for "similar")
            if (Number.isInteger(eq.oldIndex)) {
                textOldRaw = oldFragments[eq.oldIndex] ?? null;
            }
            if (Number.isInteger(eq.newIndex)) {
                textNewRaw = newFragments[eq.newIndex] ?? null;
            }

            normalizedOps.push({
                op: eq.type === "similar" ? "similar" : "equal",

                oldIndex: eq.oldIndex ?? null,
                newIndex: eq.newIndex ?? null,

                // ⭐ FIX: Real original texts, not equalText
                textOld: textOldRaw,
                textNew: textNewRaw,

                // still include similarity metadata
                similarity: eq.similarity ?? null,
                missingWords: eq.missingWords ?? null,
                addedWords: eq.addedWords ?? null
            });
        }

        //
        // MISSING (AEM only)
        //
        for (const m of finalMissing) {
            normalizedOps.push({
                op: "delete",
                oldIndex: m.oldIndex ?? null,
                newIndex: null,
                textOld: m.text,
                textNew: null,
                similarity: null
            });
        }

        //
        // ADDED (Contentstack only)
        //
        for (const a of finalAdded) {
            normalizedOps.push({
                op: "insert",
                oldIndex: null,
                newIndex: a.newIndex ?? null,
                textOld: null,
                textNew: a.text,
                similarity: null
            });
        }

        //
        // Sort ops in true reading order
        //
        normalizedOps.sort((a, b) => {
            const A = a.oldIndex ?? a.newIndex ?? 999999;
            const B = b.oldIndex ?? b.newIndex ?? 999999;
            return A - B;
        });

        scanContext.normalizedOps = normalizedOps;


        //
        // ------------------------------------------------------------
        // 10. STEP 7 – CONTENT PARITY METRICS
        // ------------------------------------------------------------
        //

        const parity = computeContentParity(
            scanContext.finalTextDiff,
            step3Old,
            step3New
        );

        scanContext.step7 = parity;

        //
        // ------------------------------------------------------------
        // 11. RETURN FINAL NORMALIZED RESULT
        // ------------------------------------------------------------
        //
        return {
            status: "ok",
            step: "text-diff",

            // original buckets (legacy)
            equals: finalEquals,
            missing: finalMissing,
            added: finalAdded,

            // NEW: fully normalized MQC2 ops
            ops: normalizedOps,

            contentParity: parity
        };

    } catch (err) {
        return {
            status: "error",
            error: err.message || "textCheck failed"
        };
    }
}
