// src/seoRules/rules/urlTrailingSlash.js

export default {
    id: "url-trailing-slash",
    topic: "URL",
    label: "Do URLs end with a slash?",
    weight: 0.5,
    preferred: false,

    async run({ old, newSeo }) {
        const evaluate = (urlObj) => {
            if (!urlObj) return { endsWithSlash: false, pass: false, neutral: false };

            const path = urlObj.pathname || "/";
            const isHome = path === "/" || path === "";

            // Homepage is neutral — do not score, do not mark pass or fail
            if (isHome) {
                return {
                    endsWithSlash: true,
                    pass: null,
                    neutral: true
                };
            }

            const endsWithSlash = path.endsWith("/");

            const pass = endsWithSlash === true; // matches your expected logic

            return {
                endsWithSlash,
                pass,
                neutral: false
            };
        };

        const oldRes = evaluate(old.url);
        const newRes = evaluate(newSeo.url);

        return {
            oldValue: oldRes.endsWithSlash ? "Yes" : "No",
            newValue: newRes.endsWithSlash ? "Yes" : "No",

            // When neutral, these must be null
            passOld: oldRes.neutral ? null : oldRes.pass,
            passNew: newRes.neutral ? null : newRes.pass,

            neutral: oldRes.neutral || newRes.neutral
        };
    }
};
