// src/config/businessUnits.js

// How each BU choice maps to buCombined query parameters
export const BU_PRESETS = {
    PH: ["PH", "General"],           // &buCombined=PH&buCombined=General
    BL: ["BL"],                      // &buCombined=BL
    "PH+BL": ["PH", "General", "BL"] // &buCombined=PH&buCombined=General&buCombined=BL
};

export function getBuCombined(businessUnitKey) {
    if (!businessUnitKey) return null;
    return BU_PRESETS[businessUnitKey] || null;
}
