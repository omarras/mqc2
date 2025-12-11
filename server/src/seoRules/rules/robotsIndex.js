// src/seoRules/rules/robotsIndex.js

import * as cheerio from "cheerio";

export default {
    id: "robots-index",
    topic: "Metadata",
    label: "Does the page have an index robots tag (unless purposely noindex on staging)?",
    weight: 0.5,
    preferred: true,

    async run({ old, newSeo }) {
        const html = newSeo.htmlRaw || "";
        const $ = cheerio.load(html || "");

        const robotsNew =
            $('meta[name="robots"]').attr("content") ||
            newSeo.meta?.robots ||
            "";

        const robotsOld = old.meta?.robots || "";
        const url = newSeo.url?.toString() || "";

        const isStaging =
            url.includes("://stg.") ||
            url.includes("://acc.2.") ||
            url.includes("://tst.2.") ||
            url.includes("://dev.2.");

        const isIndexFollow = (value) => {
            const v = (value || "").toLowerCase();
            return v.includes("index") && v.includes("follow");
        };

        const passOld = isIndexFollow(robotsOld);

        if (isStaging) {
            return {
                oldValue: robotsOld,
                newValue: robotsNew,
                passOld,
                passNew: true,
                neutral: true
            };
        }

        const passNew = isIndexFollow(robotsNew);

        return {
            oldValue: robotsOld,
            newValue: robotsNew,
            passOld,
            passNew
        };
    }
};