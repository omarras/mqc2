// src/seoRules/rules/canonicalPresent.js

export default {
    id: "canonical-present",
    topic: "Metadata",
    label: "Is the canonical tag present?",
    weight: 3,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = old.meta.canonical || "";
        const newVal = newSeo.meta.canonical || "";

        return {
            oldValue: oldVal,
            newValue: newVal,
            passOld: !!oldVal,
            passNew: !!newVal
        };
    }
};

