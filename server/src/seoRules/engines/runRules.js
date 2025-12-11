// src/seoRules/engines/runRules.js

import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rulesDir = path.join(__dirname, "../rules");

/**
 * Compute verdict based on:
 * - preferred (true/false)
 * - passOld / passNew (in your inverted model)
 * - neutral
 *
 * Semantics:
 *   preferred = true  → correct when pass === true
 *   preferred = false → correct when pass === false
 */
function computeVerdict({ passOld, passNew, neutral, preferred }) {
    if (neutral) return "neutral";

    // Normalize null/undefined to boolean for comparison
    const pOld = passOld === null || typeof passOld === "undefined" ? false : !!passOld;
    const pNew = passNew === null || typeof passNew === "undefined" ? false : !!passNew;

    const oldCorrect = preferred ? pOld === true  : pOld === false;
    const newCorrect = preferred ? pNew === true  : pNew === false;

    if (oldCorrect && newCorrect) return "equal";
    if (!oldCorrect && newCorrect) return "improved";
    if (!passNew && !passOld) return "missed-opportunity";

    // Either stayed bad (false→false or incorrect→incorrect) or got worse (true→false for preferred=true, or false→true for preferred=false)
    return "regression";
}

/**
 * Dynamically load all rules from /rules, run them, and return enriched results.
 */
export async function runSeoRules({ old, newSeo }) {
    const files = fs
        .readdirSync(rulesDir)
        .filter((file) => file.endsWith(".js"));

    const results = [];

    for (const file of files) {
        const modulePath = path.join(rulesDir, file);
        const mod = await import(url.pathToFileURL(modulePath).href);
        const rule = mod.default;

        if (!rule || typeof rule.run !== "function") {
            continue;
        }

        const res = (await rule.run({ old, newSeo })) || {};

        // Backwards compatibility:
        // if only `pass` is returned, treat it as passNew and assume passOld=true.
        let passOld = res.passOld;
        let passNew = res.passNew;

        if (typeof passNew === "undefined" && typeof res.pass !== "undefined") {
            passNew = !!res.pass;
        }
        if (typeof passOld === "undefined") {
            passOld = true;
        }
        if (typeof passNew === "undefined") {
            passNew = true;
        }

        const neutral = !!(rule.neutral || res.neutral);
        const preferred = !!rule.preferred;

        const verdict = computeVerdict({
            passOld,
            passNew,
            neutral,
            preferred
        });

        results.push({
            id: rule.id,
            topic: rule.topic,
            label: rule.label,
            weight: rule.weight,
            preferred: rule.preferred,
            neutral,
            // preserve everything the rule itself returned
            ...res,
            oldValue: res.oldValue ?? null,
            newValue: res.newValue ?? null,
            passOld,
            passNew,
            verdict
        });
    }

    return results;
}
