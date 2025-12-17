// src/validators/run.validators.js
import { assert, isNonEmptyString, isHttpsUrl } from "./util.js";
import { getLocalesForCountry } from "../config/countryLocales.js";
import { getBuCombined } from "../config/businessUnits.js";

export function validateSingleRunBody(body) {
    assert(body, "Body is required");

    const {
        urlOld,
        urlNew,
        runName,
        checkConfig = {},
        visualComparisonDesktop,
        screenshotMobile
    } = body;

    assert(isHttpsUrl(urlOld), "urlOld must be a valid https URL");
    assert(isHttpsUrl(urlNew), "urlNew must be a valid https URL");

    if (runName !== undefined) {
        assert(typeof runName === "string", "runName must be a string");
    }

    // Validate checkConfig fields explicitly
    assert(typeof checkConfig === "object", "checkConfig must be an object");

    const {
        text,
        links,
        seo,
        visualComparisonDesktop: cfgVisual,
        screenshotMobile: cfgMobile
    } = checkConfig;

    if (text !== undefined) {
        assert(typeof text === "boolean", "checkConfig.text must be a boolean");
    }

    if (links !== undefined) {
        assert(typeof links === "boolean", "checkConfig.links must be a boolean");
    }

    if (cfgVisual !== undefined) {
        assert(
            typeof cfgVisual === "boolean",
            "checkConfig.visualComparisonDesktop must be a boolean"
        );
    }

    if (cfgMobile !== undefined) {
        assert(
            typeof cfgMobile === "boolean",
            "checkConfig.screenshotMobile must be a boolean"
        );
    }

    // Top-level overrides (legacy fields still supported)
    if (visualComparisonDesktop !== undefined) {
        assert(
            typeof visualComparisonDesktop === "boolean",
            "visualComparisonDesktop must be a boolean"
        );
    }

    if (screenshotMobile !== undefined) {
        assert(
            typeof screenshotMobile === "boolean",
            "screenshotMobile must be a boolean"
        );
    }

    // Merge both sources (top-level + checkConfig) so Scan always receives a full config
    const normalizedCheckConfig = {
        text: text ?? false,
        links: links ?? false,
        seo: seo ?? false,
        visualComparisonDesktop: cfgVisual ?? visualComparisonDesktop ?? false,
        screenshotMobile: cfgMobile ?? screenshotMobile ?? false
    };

    return {
        urlOld,
        urlNew,
        runName,
        checkConfig: normalizedCheckConfig,
        visualComparisonDesktop: normalizedCheckConfig.visualComparisonDesktop,
        screenshotMobile: normalizedCheckConfig.screenshotMobile
    };
}

export function validateBulkRequest(req) {
    assert(req.file, "CSV file is required");

    if (req.body.checkConfig) {
        try {
            JSON.parse(req.body.checkConfig);
        } catch {
            assert(false, "checkConfig must be valid JSON");
        }
    }
}

export function validateFetchCsvBody(body) {
    assert(body, "Body is required");

    const { countryCode, businessUnit, checkConfig } = body;

    assert(isNonEmptyString(countryCode), "countryCode is required");
    assert(isNonEmptyString(businessUnit), "businessUnit is required");

    const locales = getLocalesForCountry(countryCode);
    assert(locales && locales.length > 0, "Unknown or unsupported countryCode");

    const buCombined = getBuCombined(businessUnit);
    assert(buCombined && buCombined.length > 0, "Unknown or unsupported businessUnit");

    if (checkConfig) {
        try {
            JSON.parse(checkConfig);
        } catch {
            assert(false, "checkConfig must be valid JSON");
        }
    }

    return { countryCode, businessUnit, locales, buCombined };
}

export function validateUpdateDsStatusBody(body) {
    const dsStatus = body?.dsStatus;

    if (typeof dsStatus !== "string" || !dsStatus.trim()) {
        const err = new Error("dsStatus must be a non-empty string");
        err.status = 400;
        throw err;
    }

    // Strict allow-list for the "user workflow" statuses.
    // You can relax this later if you want admins to set any DS status.
    const allowed = new Set([
        "Ready for UAT",
        "UAT feedback provided",
        "UAT approved"
    ]);

    const normalized = dsStatus.trim();
    if (!allowed.has(normalized)) {
        const err = new Error(
            `dsStatus must be one of: ${Array.from(allowed).join(", ")}`
        );
        err.status = 400;
        throw err;
    }

    return { dsStatus: normalized };
}
