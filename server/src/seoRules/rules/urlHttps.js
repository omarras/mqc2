// src/seoRules/rules/urlHttps.js

export default {
    id: "url-https",
    topic: "URL",
    label: "Is the URL using the HTTPS protocol?",
    weight: 10,
    preferred: true,

    async run({ old, newSeo }) {
        const isHttps = (urlObj) =>
            !!urlObj && urlObj.protocol === "https:";

        const oldOk = isHttps(old.url);
        const newOk = isHttps(newSeo.url);

        return {
            oldValue: oldOk ? "Yes" : "No",
            newValue: newOk ? "Yes" : "No",
            passOld: oldOk,
            passNew: newOk
        };
    }
};
