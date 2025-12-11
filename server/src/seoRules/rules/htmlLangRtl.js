// src/seoRules/rules/htmlLangRtl.js

export default {
    id: "html-lang-rtl",
    topic: "Metadata",
    label: "For applicable languages like Arabic, is text direction set to RTL?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const oldLang = (old.lang || "").trim().toLowerCase();
        const newLang = (newSeo.lang || "").trim().toLowerCase();
        const newDir = (newSeo.dir || "").trim().toLowerCase();

        const isArabic = (lang) => lang.startsWith("ar");

        const oldIsArabic = isArabic(oldLang);
        const newIsArabic = isArabic(newLang);

        // Neutral case: neither page is Arabic, rule does not apply
        const neutral = !oldIsArabic && !newIsArabic;

        if (neutral) {
            return {
                oldValue: oldLang,
                newValue: `${newLang} (dir=${newDir || "none"})`,
                passOld: null,   // not applicable
                passNew: null,   // not applicable
                neutral: true
            };
        }

        // Rule applies ONLY for Arabic
        const passOld = oldIsArabic ? old.dir?.toLowerCase() === "rtl" : null;
        const passNew = newIsArabic ? newDir === "rtl" : null;

        return {
            oldValue: oldLang,
            newValue: `${newLang} (dir=${newDir || "none"})`,
            passOld,
            passNew,
            neutral: false
        };
    }
};