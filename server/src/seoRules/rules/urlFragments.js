// src/seoRules/rules/urlFragments.js

export default {
    id: "url-fragments",
    topic: "URL",
    label: "Does the URL contain fragments (#)?",
    weight: 0.5,
    preferred: false,

    async run({ old, newSeo }) {
        const hasFragment = (u) => u?.hash && u.hash !== "";

        const oldHas = hasFragment(old.url);
        const newHas = hasFragment(newSeo.url);

        // Preferred = false → correct outcome is NO → pass = false
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

