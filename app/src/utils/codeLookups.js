// src/utils/codeLookups.js
// Source of truth: src/config/countryLocales.js

import { countryLocalesExpanded } from "../config/countryLocales.js";

/**
 * Build supported lists from config
 */
export const SUPPORTED = (() => {
    const countries = countryLocalesExpanded
        .map(c => String(c.code || "").trim().toUpperCase())
        .filter(Boolean);

    const languageSet = new Set();
    for (const c of countryLocalesExpanded) {
        for (const loc of c.locales || []) {
            const { language } = parseLocale(loc);
            if (language) languageSet.add(language); // lower-case language tags
        }
    }

    const languages = Array.from(languageSet).sort();

    return { countries, languages };
})();

/**
 * Country name map from your config (stable naming)
 * { "GB": "United Kingdom", ... }
 */
const COUNTRY_NAME_BY_CODE = (() => {
    const m = new Map();
    for (const c of countryLocalesExpanded) {
        const code = String(c.code || "").trim().toUpperCase();
        if (!code) continue;
        m.set(code, c.name);
    }

    // Optional aliases
    // People sometimes send UK even though the ISO code is GB.
    if (m.has("GB")) m.set("UK", m.get("GB"));

    return m;
})();

/**
 * Intl display names (for language names mainly)
 * We keep these in English for consistency in UI, change ["en"] to user language if desired.
 */
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

/**
 * Normalization
 */
export function normalizeCountryCode(code) {
    if (!code) return "";
    const c = String(code).trim().toUpperCase();
    if (c === "UK") return "GB";
    return c;
}

export function normalizeLanguageCode(code) {
    if (!code) return "";
    const raw = String(code).trim();

    // Accept "EN", "en", "en_GB", "en-GB"
    const base = raw.replace("_", "-").split("-")[0];

    return base.toLowerCase(); // Intl expects BCP47-ish tags, "en"
}

/**
 * Parse locale like "en_GB" or "en-GB"
 */
export function parseLocale(locale) {
    if (!locale) return { language: "", country: "" };

    const s = String(locale).trim().replace("_", "-");
    const [lang, region] = s.split("-");

    return {
        language: normalizeLanguageCode(lang),
        country: normalizeCountryCode(region)
    };
}

/**
 * Lookups
 */
export function isSupportedCountry(code) {
    const c = normalizeCountryCode(code);
    return SUPPORTED.countries.includes(c);
}

export function isSupportedLanguage(code) {
    const l = normalizeLanguageCode(code);
    return SUPPORTED.languages.includes(l);
}

/**
 * Country display name:
 * - Prefer your config naming (stable, business-friendly)
 * - Fallback to Intl if needed
 * - Fallback to code as last resort
 */
export function countryName(code) {
    const c = normalizeCountryCode(code);
    if (!c) return "";

    const fromConfig = COUNTRY_NAME_BY_CODE.get(c);
    if (fromConfig) return fromConfig;

    // Only call Intl for real ISO-3166-1 alpha-2 codes
    if (!/^[A-Z]{2}$/.test(c)) return c;

    try {
        return regionNames.of(c) || c;
    } catch {
        return c;
    }
}

export function languageName(code) {
    const l = normalizeLanguageCode(code);
    if (!l) return "";

    // language should be 2-3 letters typically
    if (!/^[a-z]{2,3}$/.test(l)) return l.toUpperCase();

    try {
        return languageNames.of(l) || l.toUpperCase();
    } catch {
        return l.toUpperCase();
    }
}

/**
 * Flag key for your SVG file naming:
 * src/assets/flags/gb.svg, ie.svg, sk.svg, etc.
 */
export function flagKey(countryCode) {
    const c = normalizeCountryCode(countryCode);
    if (!c) return "";
    return c.toLowerCase();
}

/**
 * Convenience: build from either discrete codes or locale string
 */
export function prettyFromCodes({ countryCode, languageCode, locale } = {}) {
    let c = countryCode ? normalizeCountryCode(countryCode) : "";
    let l = languageCode ? normalizeLanguageCode(languageCode) : "";

    if ((!c || !l) && locale) {
        const parsed = parseLocale(locale);
        if (!l) l = parsed.language;
        if (!c) c = parsed.country;
    }

    return {
        countryCode: c,
        languageCode: l,
        country: countryName(c),
        language: languageName(l),
        flag: flagKey(c)
    };
}
