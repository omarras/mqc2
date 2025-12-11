// src/controllers/locales.controller.js

import { countryLocalesExpanded } from "../config/countryLocales.js";

export async function listCountries(req, res) {
    try {
        // Simple return of entire mapping
        res.json({
            count: countryLocalesExpanded.length,
            countries: countryLocalesExpanded
        });
    } catch (err) {
        console.error("[listCountries] Error", err);
        res.status(500).json({ error: true, message: "Failed to load locales mapping" });
    }
}
