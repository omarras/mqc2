// src/seoRules/rules/urlHyphens.js

export default {
    id: "url-hyphens",
    topic: "URL",
    label: "Are words separated by hyphens?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const slugFrom = (urlObj) => {
            if (!urlObj) return "";
            const parts = urlObj.pathname.split("/").filter(Boolean);
            return parts[parts.length - 1] || "";
        };

        const isGood = (slug) => {
            if (!slug) return true; // single word or nothing → OK

            // Bad separators
            if (slug.includes("_") || slug.includes("+") || slug.includes("%20")) {
                return false;
            }

            // If it uses hyphens to separate words → good
            return true;
        };

        const oldSlug = slugFrom(old.url);
        const newSlug = slugFrom(newSeo.url);

        const oldOk = isGood(oldSlug);
        const newOk = isGood(newSlug);

        return {
            oldValue: oldOk ? "Yes" : "No",
            newValue: newOk ? "Yes" : "No",
            passOld: oldOk,
            passNew: newOk
        };
    }
};
