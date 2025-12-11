// src/seoRules/rules/htmlLangIsoFormat.js

export default {
    id: "html-lang-iso-format",
    topic: "Metadata",
    label: "Does the HTML lang attribute follow the ISO standard (e.g., en-US)?",
    weight: 5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = old.lang || "";
        const newVal = newSeo.lang || "";

        const iso = /^[a-z]{2}-[A-Z]{2}$/;

        return {
            oldValue: oldVal,
            newValue: newVal,
            passOld: iso.test(oldVal),
            passNew: iso.test(newVal)
        };
    }
};

