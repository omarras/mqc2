// src/utils/codeLookups.js

import { countryLocalesExpanded } from "../config/countryLocales.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

export function normalizeCountryCode(code) {
    if (!code) return "";
    const c = String(code).trim().toUpperCase();
    if (c === "UK") return "GB"; // common non-ISO input
    return c;
}

export function normalizeLanguageCode(code) {
    if (!code) return "";
    const raw = String(code).trim().replace("_", "-");
    return raw.split("-")[0].toLowerCase(); // "en_GB" → "en"
}

export function parseLocale(locale) {
    if (!locale) return { language: "", country: "" };
    const s = String(locale).trim().replace("_", "-");
    const [lang, region] = s.split("-");
    return {
        language: normalizeLanguageCode(lang),
        country: normalizeCountryCode(region)
    };
}

/* ------------------------------------------------------------------
   Supported lists (derived from config)
------------------------------------------------------------------ */

export const SUPPORTED = (() => {
    const countries = [];
    const languageSet = new Set();

    for (const c of countryLocalesExpanded) {
        if (c.code) {
            countries.push(normalizeCountryCode(c.code));
        }

        for (const loc of c.locales || []) {
            const { language } = parseLocale(loc);
            if (language) languageSet.add(language);
        }
    }

    return {
        countries: countries.sort(),
        languages: Array.from(languageSet).sort()
    };
})();

/* ------------------------------------------------------------------
   Country name map (authoritative naming from config)
------------------------------------------------------------------ */

const COUNTRY_NAME_BY_CODE = (() => {
    const map = new Map();

    for (const c of countryLocalesExpanded) {
        const code = normalizeCountryCode(c.code);
        if (!code) continue;
        map.set(code, c.name);
    }

    // Alias support
    if (map.has("GB")) {
        map.set("UK", map.get("GB"));
    }

    return map;
})();

/* ------------------------------------------------------------------
   Intl display names (for languages)
------------------------------------------------------------------ */

const languageNames = new Intl.DisplayNames(["en"], {
    type: "language"
});

/* ------------------------------------------------------------------
   Public lookup functions
------------------------------------------------------------------ */

export function isSupportedCountry(code) {
    return SUPPORTED.countries.includes(normalizeCountryCode(code));
}

export function isSupportedLanguage(code) {
    return SUPPORTED.languages.includes(normalizeLanguageCode(code));
}

export function countryName(code) {
    const c = normalizeCountryCode(code);
    if (!c) return "";
    return COUNTRY_NAME_BY_CODE.get(c) || c;
}

export function languageName(code) {
    const l = normalizeLanguageCode(code);
    if (!l) return "";
    return languageNames.of(l) || l.toUpperCase();
}

/**
 * Flag key for SVGs:
 * src/assets/flags/<key>.svg
 * Example: GB → gb.svg
 */
export function flagKey(code) {
    const c = normalizeCountryCode(code);
    return c ? c.toLowerCase() : "";
}

/**
 * Convenience helper when you have mixed input
 */
export function prettyFromCodes({
                                    countryCode,
                                    languageCode,
                                    locale
                                } = {}) {
    let country = normalizeCountryCode(countryCode);
    let language = normalizeLanguageCode(languageCode);

    if ((!country || !language) && locale) {
        const parsed = parseLocale(locale);
        if (!country) country = parsed.country;
        if (!language) language = parsed.language;
    }

    return {
        countryCode: country,
        languageCode: language,
        country: countryName(country),
        language: languageName(language),
        flag: flagKey(country)
    };
}
