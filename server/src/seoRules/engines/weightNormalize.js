// src/seoRules/engines/weightNormalize.js

export function computeNormalizedWeights(rules) {
    const active = rules.filter(r => !r.neutral);

    const totalWeight = active.reduce((sum, r) => sum + (r.weight || 0), 0);

    let globalScore = 0;

    // enrich rules in place
    rules.forEach(r => {
        if (r.neutral) {
            r.normalizedWeight = 0;
            r.score = null;
            return;
        }

        const normalized = (r.weight || 0) / totalWeight;
        const score = r.passNew ? normalized : 0;

        r.normalizedWeight = normalized;
        r.score = score;

        globalScore += score;
    });

    return {
        globalScore,
        weights: {
            totalWeight,
            activeRules: active.length
        }
    };
}
