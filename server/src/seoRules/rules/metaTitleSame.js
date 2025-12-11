// src/seoRules/rules/metaTitleSame.js

export default {
    id: "meta-title-same",
    topic: "Metadata",
    label: "Is the meta title the same?",
    weight: 3,
    preferred: true,

    async run({ old, newSeo }) {
        const oldTitle = (old.meta.title || "").trim();
        const newTitle = (newSeo.meta.title || "").trim();

        const same =
            oldTitle === newTitle ||
            oldTitle === newTitle.trimEnd();

        return {
            oldValue: oldTitle,
            newValue: newTitle,
            passOld: true,
            passNew: same
        };
    }
};