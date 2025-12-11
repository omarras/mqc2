// src/seoRules/rules/urlLowercase.js

export default {
    id: "url-lowercase",
    topic: "URL",
    label: "Are URLs in lowercase?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const slugFrom = (urlObj) => {
            if (!urlObj) return "";
            const parts = urlObj.pathname.split("/").filter(Boolean);
            return parts[parts.length - 1] || "";
        };

        const oldSlug = slugFrom(old.url);
        const newSlug = slugFrom(newSeo.url);

        const isLower = (s) => s === s.toLowerCase();

        const oldOk = !!oldSlug && isLower(oldSlug);
        const newOk = !!newSlug && isLower(newSlug);

        return {
            oldValue: oldOk ? "Yes" : "No",
            newValue: newOk ? "Yes" : "No",
            passOld: oldOk,
            passNew: newOk
        };
    }
};
