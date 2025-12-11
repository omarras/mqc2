// src/seoRules/rules/urlUtf8.js

export default {
    id: "url-utf8",
    topic: "URL",
    label: "Is the URL UTF-8 compliant and free of special characters?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const check = (urlObj) => {
            if (!urlObj) return false;
            const href = urlObj.toString();

            try {
                decodeURI(href);
            } catch {
                return false;
            }

            // Disallow obvious bad encodings / characters
            const badPatterns = [
                /\s/,          // raw space
                /%20/,         // encoded space
                /[<>"{}|\\^`]/ // really unsafe chars
            ];

            return !badPatterns.some((re) => re.test(href));
        };

        const oldOk = check(old.url);
        const newOk = check(newSeo.url);

        return {
            oldValue: oldOk ? "Yes" : "No",
            newValue: newOk ? "Yes" : "No",
            passOld: oldOk,
            passNew: newOk
        };
    }
};