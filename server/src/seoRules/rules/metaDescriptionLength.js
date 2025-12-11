// src/seoRules/rules/metaDescriptionLength.js

export default {
    id: "meta-description-length",
    topic: "Metadata",
    label: "Is the meta description less than 300 characters?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = (old.meta.description || "").trim();
        const newVal = (newSeo.meta.description || "").trim();

        const oldLen = oldVal.length;
        const newLen = newVal.length;

        return {
            oldValue: oldVal,
            newValue: newVal,
            charactersOld: oldLen,
            charactersNew: newLen,
            passOld: oldLen <= 300,
            passNew: newLen <= 300
        };
    }
};