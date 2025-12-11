// src/seoRules/rules/htmlLangLocaleMatch.js

export default {
    id: "html-lang-locale-match",
    topic: "Metadata",
    label: "Is the HTML lang attribute set to the correct language-country combination?",
    weight: 5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldLang = old.lang || "";
        const newLang = newSeo.lang || "";
        const locale = newSeo.localeTag || "";

        const [localeLangRaw, localeCountryRaw] = locale.split("_");
        const localeLang = (localeLangRaw || "").toLowerCase();
        const localeCountry = (localeCountryRaw || "").toLowerCase();

        const [htmlLangRaw, htmlCountryRaw] = newLang.split(/[-_]/);
        const htmlLang = (htmlLangRaw || "").toLowerCase();
        const htmlCountry = (htmlCountryRaw || "").toLowerCase();

        const hasLocale = !!(localeLang && localeCountry);
        const hasHtmlPair = !!(htmlLang && htmlCountry);

        const passNew =
            hasLocale &&
            hasHtmlPair &&
            htmlLang === localeLang &&
            htmlCountry === localeCountry;

        return {
            oldValue: oldLang,
            newValue: newLang,
            passOld: true,
            passNew
        };
    }
};
