// src/seoRules/rules/urlPathMatch.js

export default {
    id: "url-path-match",
    topic: "URL",
    label: "Is the URL path the same?",
    weight: 5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldUrl = old.url;
        const newUrl = newSeo.url;

        const oldPath = oldUrl ? oldUrl.pathname : "";
        const newPath = newUrl ? newUrl.pathname : "";

        const same = oldPath === newPath;

        return {
            oldValue: oldPath,
            newValue: newPath,
            passOld: true,      // reference
            passNew: same
        };
    }
};