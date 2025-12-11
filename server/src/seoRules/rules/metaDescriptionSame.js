// src/seoRules/rules/metaDescriptionSame.js

export default {
    id: "meta-description-same",
    topic: "Metadata",
    label: "Is the meta description the same?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldVal = (old.meta.description || "").trim();
        const newVal = (newSeo.meta.description || "").trim();

        const same =
            oldVal === newVal ||
            oldVal === newVal.trimEnd();

        return {
            oldValue: oldVal,
            newValue: newVal,
            passOld: true,
            passNew: same
        };
    }
};