// src/seoRules/rules/metaTitleLength.js

export default {
    id: "meta-title-length",
    topic: "Metadata",
    label: "Is the meta title less than 100 characters?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldTitle = (old.meta.title || "").trim();
        const newTitle = (newSeo.meta.title || "").trim();

        const oldLen = oldTitle.length;
        const newLen = newTitle.length;

        return {
            oldValue: oldTitle,
            newValue: newTitle,
            charactersOld: oldLen,
            charactersNew: newLen,
            passOld: oldLen <= 100,
            passNew: newLen <= 100
        };
    }
};

