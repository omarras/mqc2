import { diff_match_patch } from "diff-match-patch";

/**
 * Step 6 – Word-level similarity + split-diff
 *
 * FINAL, FIXED VERSION
 * - Proper punctuation normalization
 * - Correct equal/missing/added output
 * - Prevents false diffs like “professional?” vs “professional ?”
 */

export function WordDiff(missing, added, opts = {}) {
    const threshold = opts.threshold ?? 0.85;
    const minWords = opts.minWords ?? 3;

    const dmp = new diff_match_patch();
    const usedAdded = new Set();
    const newEquals = [];

    //
    // -------------------------
    // 1. Tokenization (fixed)
    // -------------------------
    //
    function normalizeWord(w) {
        return w
            .toLowerCase()
            .replace(/[!?.,;:]+$/g, "") // strip punctuation end
            .trim();
    }

    function tokenizeForSimilarity(str) {
        return String(str || "")
            .toLowerCase()
            .replace(/[!?.,;:]/g, " ") // convert punctuation into space
            .split(/\s+/)
            .map(normalizeWord)
            .filter(Boolean);
    }

    //
    // -------------------------
    // 2. normalizeForDiff()
    // Ensures that "professional?" and "professional ?" become identical
    // -------------------------
    //
    function normalizeForDiff(str) {
        return String(str || "")
            .replace(/([!?.,;:])/g, " $1 ") // space out punctuation
            .replace(/\s+/g, " ")
            .trim();
    }

    //
    // -------------------------
    // 3. Word-level diff with normalized input
    // -------------------------
    //
    function diffWordsOpsNormalized(aTextOriginal, bTextOriginal) {
        const aText = normalizeForDiff(aTextOriginal);
        const bText = normalizeForDiff(bTextOriginal);

        const aWords = aText.split(/\s+/);
        const bWords = bText.split(/\s+/);

        const joinedA = aWords.join("\n");
        const joinedB = bWords.join("\n");

        const map = dmp.diff_linesToChars_(joinedA, joinedB);
        let diffs = dmp.diff_main(map.chars1, map.chars2);
        dmp.diff_cleanupSemantic(diffs);
        dmp.diff_charsToLines_(diffs, map.lineArray);

        return diffs
            .map(([op, txt]) => ({
                op: op === 0 ? "equal" : op === 1 ? "insert" : "delete",
                text: txt.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
            }))
            .filter(o => o.text && o.text.length > 0);
    }

    //
    // -------------------------
    // 4. Main matching loop
    // -------------------------
    //
    for (const m of missing) {
        const wordsA = tokenizeForSimilarity(m.text);
        const setA = new Set(wordsA);
        if (setA.size < minWords) continue;

        let best = null;
        let bestSim = 0;

        for (const a of added) {
            if (usedAdded.has(a.newIndex)) continue;

            const wordsB = tokenizeForSimilarity(a.text);
            const setB = new Set(wordsB);

            if (setB.size < minWords) continue;

            const identical = [...setA].filter(w => setB.has(w)).length;
            const union = new Set([...setA, ...setB]).size;

            const similarity = identical / union;

            if (similarity > bestSim) {
                bestSim = similarity;
                best = a;
            }
        }

        if (!best || bestSim < threshold) continue;

        usedAdded.add(best.newIndex);

        //
        // 5. Produce TRUE equal/missing/added segments
        //
        const ops = diffWordsOpsNormalized(m.text, best.text);

        const equalText = ops
            .filter(o => o.op === "equal")
            .map(o => o.text)
            .join(" ")
            .trim();

        const missingWords = ops
            .filter(o => o.op === "delete")
            .map(o => o.text)
            .join(" ")
            .trim();

        const addedWords = ops
            .filter(o => o.op === "insert")
            .map(o => o.text)
            .join(" ")
            .trim();

        newEquals.push({
            oldIndex: m.oldIndex,
            newIndex: best.newIndex,
            similarity: Number(bestSim.toFixed(4)),
            equalText,
            missingWords,
            addedWords
        });
    }

    //
    // -------------------------
    // 6. Remaining missing/added
    // -------------------------
    //
    const finalMissing = missing.filter(
        m => !newEquals.some(e => e.oldIndex === m.oldIndex)
    );

    const finalAdded = added.filter(
        a => !newEquals.some(e => e.newIndex === a.newIndex)
    );

    return { newEquals, finalMissing, finalAdded };
}
