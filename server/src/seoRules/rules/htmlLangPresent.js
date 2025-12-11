// src/seoRules/rules/htmlLangPresent.js

export default {
    id: "html-lang-present",
    topic: "Metadata",
    label: "Does the page have the HTML lang attribute?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = old.lang || "";
        const newVal = newSeo.lang || "";

        return {
            oldValue: oldVal,
            newValue: newVal,
            passOld: !!oldVal,
            passNew: !!newVal
        };
    }
};

