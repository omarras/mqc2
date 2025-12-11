// server/src/pipeline/steps/seoCheck.js

import { extractSeo } from "../../seoRules/extract/seoExtract.js";
import { runSeoRules } from "../../seoRules/engines/runRules.js";
import { computeNormalizedWeights } from "../../seoRules/engines/weightNormalize.js";

export async function seoCheck({ scanContext, metadata }) {
    try {
        const urlOld = metadata?.pageDataCheck?.urlOld?.originalUrl;
        const urlNew = metadata?.pageDataCheck?.urlNew?.originalUrl;

        if (!urlOld || !urlNew) {
            return { status: "error", error: "seoCheck: missing URLs" };
        }

        // ------------------------------------------------------------
        // 🚀 NEW: USE HTML PROVIDED BY HEAVY PIPELINE (NO FETCH HERE)
        // ------------------------------------------------------------
        const htmlOld = scanContext.htmlOld_http;
        const htmlNew = scanContext.htmlNew_http;

        if (!htmlOld || !htmlNew) {
            return {
                status: "error",
                error: "seoCheck: HTML not available in scanContext (htmlOld_http/htmlNew_http missing)"
            };
        }

        // ------------------------------------------------------------
        // 🧠 SEO MUST ALWAYS USE RAW HTTP HTML (NOT PLAYWRIGHT HTML)
        // ------------------------------------------------------------
        const oldSeo = extractSeo(htmlOld, urlOld);
        const newSeo = extractSeo(htmlNew, urlNew);

        const rules = await runSeoRules({
            old: oldSeo,
            newSeo: newSeo
        });

        const summary = computeNormalizedWeights(rules);
        const errors = rules.filter(r => r.passNew === false);

        return {
            status: "ok",
            rules,
            errors,
            summary
        };
    } catch (err) {
        return { status: "error", error: err.message };
    }
}
