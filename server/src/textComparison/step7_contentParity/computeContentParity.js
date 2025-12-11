//
// Step 7 – Content Parity Metrics
//
// Input:
//   - finalTextDiff = { equals, missing, added }
//   - step3Old.wordCount
//   - step3New.wordCount
//
// Output:
//   {
//     score,                      // equalWords / totalWords
//     percentages: {
//       equal:   equalWords / totalWords,
//       missing: missingWords / totalWords,
//       added:   addedWords / totalWords
//     },
//     counts: {
//       totalWords,
//       equalWords,
//       missingWords,
//       addedWords
//     }
//   }
//

export function computeContentParity(finalTextDiff, step3Old, step3New) {

    // --- 1. Determine totalWords using OPTION A ---
    const totalWords = Math.max(step3Old.wordCount || 0, step3New.wordCount || 0);

    if (totalWords === 0) {
        return {
            score: 1,
            percentages: { equal: 1, missing: 0, added: 0 },
            counts: { totalWords: 0, equalWords: 0, missingWords: 0, addedWords: 0 }
        };
    }

    // Helper to count words
    const countWords = text =>
        String(text || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;

    // --- 2. Count equal words ---
    let equalWords = 0;

    // From step 4 exact matches
    for (const e of finalTextDiff.equals) {
        if (e.type === "exact") {
            equalWords += countWords(e.text);
        }
        if (e.type === "similar") {
            equalWords += countWords(e.equalText);
        }
    }

    // --- 3. Count missing words ---
    let missingWords = 0;
    for (const m of finalTextDiff.missing) {
        missingWords += countWords(m.text);
    }

    // --- 4. Count added words ---
    let addedWords = 0;
    for (const a of finalTextDiff.added) {
        addedWords += countWords(a.text);
    }

    // --- 5. Compute percentages ---
    const equalRatio   = equalWords   / totalWords;
    const missingRatio = missingWords / totalWords;
    const addedRatio   = addedWords   / totalWords;

    return {
        score: equalRatio,
        percentages: {
            equal: equalRatio,
            missing: missingRatio,
            added: addedRatio
        },
        counts: {
            totalWords,
            equalWords,
            missingWords,
            addedWords
        }
    };
}
