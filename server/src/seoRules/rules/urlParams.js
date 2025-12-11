// src/seoRules/rules/urlParams.js

export default {
    id: "url-params",
    topic: "URL",
    label: "Does the URL have parameters?",
    weight: 0.5,
    preferred: false,

    async run({ old, newSeo }) {
        const hasParams = (u) => u?.search && u.search !== "";

        const oldHas = hasParams(old.url);
        const newHas = hasParams(newSeo.url);

        const passOld = oldHas === true;
        const passNew = newHas === true;

        return {
            oldValue: oldHas ? "Yes" : "No",
            newValue: newHas ? "Yes" : "No",
            passOld,
            passNew
        };
    }
};
