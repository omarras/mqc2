// src/seoRules/rules/canonicalSelfRef.js

export default {
    id: "canonical-self-ref",
    topic: "Metadata",
    label: "Is the canonical tag self-referring?",
    weight: 3,
    preferred: true,

    async run({ old, newSeo }) {
        const oldCanonical = old.meta.canonical || "";
        const newCanonical = newSeo.meta.canonical || "";
        const newUrl = newSeo.url?.toString() || "";

        const normalize = (v) => (v || "").replace(/\/$/, "");

        const passOld =
            !!oldCanonical && normalize(oldCanonical) === normalize(old.url?.toString() || "");

        const passNew =
            !!newCanonical && normalize(newCanonical) === normalize(newUrl);

        return {
            oldValue: oldCanonical,
            newValue: newCanonical,
            passOld,
            passNew
        };
    }
};