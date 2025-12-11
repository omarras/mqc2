// src/seoRules/rules/canonicalAbsolute.js

export default {
    id: "canonical-absolute",
    topic: "Metadata",
    label: "Is the canonical an absolute URL, with HTTPS and WWW?",
    weight: 3,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = old.meta.canonical || "";
        const newVal = newSeo.meta.canonical || "";

        const isValid = (v) =>
            v.startsWith("https://www.") ||
            v.startsWith("https://") && v.includes("www.");

        return {
            oldValue: oldVal,
            newValue: newVal,
            passOld: isValid(oldVal),
            passNew: isValid(newVal)
        };
    }
};

