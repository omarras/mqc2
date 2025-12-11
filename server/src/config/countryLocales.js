// src/config/countryLocales.js

export const countryLocalesExpanded = [
    { code: "AT", name: "Austria", locales: ["de_AT"] },
    { code: "BE", name: "Belgium", locales: ["fr_BE", "nl_BE"] },
    { code: "BG", name: "Bulgaria", locales: ["bg_BG"] },
    { code: "CH", name: "Switzerland", locales: ["de_CH", "fr_CH"] },
    { code: "CZ", name: "Czech Republic", locales: ["cs_CZ"] },
    { code: "DE", name: "Germany", locales: ["de_DE"] },
    { code: "DK", name: "Denmark", locales: ["da_DK"] },
    { code: "EE", name: "Estonia", locales: ["et_EE"] },
    { code: "ES", name: "Spain", locales: ["es_ES"] },
    { code: "FI", name: "Finland", locales: ["fi_FI"] },
    { code: "FR", name: "France", locales: ["fr_FR"] },
    { code: "GR", name: "Greece", locales: ["el_GR"] },
    { code: "HR", name: "Croatia", locales: ["hr_HR"] },
    { code: "HU", name: "Hungary", locales: ["hu_HU"] },
    { code: "IE", name: "Ireland", locales: ["en_IE"] },
    { code: "IT", name: "Italy", locales: ["it_IT"] },
    { code: "LT", name: "Lithuania", locales: ["lt_LT"] },
    { code: "LV", name: "Latvia", locales: ["lv_LV"] },
    { code: "NL", name: "Netherlands", locales: ["nl_NL"] },
    { code: "NO", name: "Norway", locales: ["no_NO"] },
    { code: "PL", name: "Poland", locales: ["pl_PL"] },
    { code: "PT", name: "Portugal", locales: ["pt_PT"] },
    { code: "RO", name: "Romania", locales: ["ro_RO"] },
    { code: "RS", name: "Serbia", locales: ["sr_RS"] },
    { code: "SE", name: "Sweden", locales: ["sv_SE"] },
    { code: "SI", name: "Slovenia", locales: ["sl_SI"] },
    { code: "SK", name: "Slovakia", locales: ["sk_SK"] },
    { code: "UA", name: "Ukraine", locales: ["uk_UA", "ru_UA"] },
    { code: "AM", name: "Armenia", locales: ["hy_AM"] },
    { code: "AZ", name: "Azerbaijan", locales: ["az_AZ"] },
    { code: "BY", name: "Belarus", locales: ["ru_BY"] },
    { code: "GE", name: "Georgia", locales: ["ka_GE"] },
    { code: "KZ", name: "Kazakhstan", locales: ["ru_KZ"] },
    { code: "RU", name: "Russia", locales: ["ru_RU"] },
    { code: "UZ", name: "Uzbekistan", locales: ["ru_UZ"] },
    { code: "AE", name: "United Arab Emirates", locales: ["ar_AE", "en_AE"] },
    { code: "BH", name: "Bahrain", locales: ["ar_BH", "en_BH"] },
    { code: "EG", name: "Egypt", locales: ["ar_EG", "en_EG"] },
    { code: "IQ", name: "Iraq", locales: ["ar_IQ", "en_IQ"] },
    { code: "JO", name: "Jordan", locales: ["ar_JO", "en_JO"] },
    { code: "KW", name: "Kuwait", locales: ["ar_KW", "en_KW"] },
    { code: "LB", name: "Lebanon", locales: ["ar_LB", "en_LB"] },
    { code: "OM", name: "Oman", locales: ["ar_OM", "en_OM"] },
    { code: "QA", name: "Qatar", locales: ["ar_QA", "en_QA"] },
    { code: "SA", name: "Saudi Arabia", locales: ["ar_SA", "en_SA"] },
    { code: "HK", name: "Hong Kong", locales: ["zh_HK", "en_HK"] },
    { code: "CN", name: "China", locales: ["zh_CN"] },
    { code: "TW", name: "Taiwan", locales: ["zh_TW"] },
    { code: "JP", name: "Japan", locales: ["ja_JP"] },
    { code: "KR", name: "South Korea", locales: ["ko_KR"] },
    { code: "TH", name: "Thailand", locales: ["th_TH"] },
    { code: "VN", name: "Vietnam", locales: ["vi_VN"] },
    { code: "ID", name: "Indonesia", locales: ["id_ID", "en_ID"] },
    { code: "IN", name: "India", locales: ["en_IN"] },
    { code: "MY", name: "Malaysia", locales: ["en_MY"] },
    { code: "PH", name: "Philippines", locales: ["en_PH"] },
    { code: "PK", name: "Pakistan", locales: ["en_PK"] },
    { code: "SG", name: "Singapore", locales: ["en_SG"] },
    { code: "AU", name: "Australia", locales: ["en_AU"] },
    { code: "NZ", name: "New Zealand", locales: ["en_NZ"] },
    { code: "CA", name: "Canada", locales: ["en_CA", "fr_CA"] },
    { code: "US", name: "United States", locales: ["en_US"] },
    { code: "AR", name: "Argentina", locales: ["es_AR"] },
    { code: "CL", name: "Chile", locales: ["es_CL"] },
    { code: "CO", name: "Colombia", locales: ["es_CO"] },
    { code: "MX", name: "Mexico", locales: ["es_MX"] },
    { code: "PA", name: "Panama", locales: ["es_PA"] },
    { code: "PE", name: "Peru", locales: ["es_PE"] },
    { code: "UY", name: "Uruguay", locales: ["es_UY"] },
    { code: "BR", name: "Brazil", locales: ["pt_BR"] },
    { code: "GH", name: "Ghana", locales: ["en_GH"] },
    { code: "KE", name: "Kenya", locales: ["en_KE"] },
    { code: "NG", name: "Nigeria", locales: ["en_NG"] },
    { code: "ZA", name: "South Africa", locales: ["en_ZA"] }
];

export function getCountryByCode(code) {
    return countryLocalesExpanded.find(c => c.code === code) || null;
}

export function getCountryByName(name) {
    return countryLocalesExpanded.find(
        c => c.name.toLowerCase() === name.toLowerCase()
    ) || null;
}

export function getLocalesForCountry(code) {
    const c = getCountryByCode(code);
    return c ? c.locales : null;
}

export const countryOptions = countryLocalesExpanded.map(c => ({
    label: c.name,
    value: c.code
}));
