// /src/mappers/mqc2-to-mqc1.js

export function mapScanToMQC1(scan) {
    if (!scan) return {};

    const out = {};

    /* ---------------------- Desktop Screenshots ----------------------- */
    if (scan.results?.visualComparisonDesktop) {
        const d = scan.results.visualComparisonDesktop;
        out.screenshot = {
            aem: {
                imagePath: d.aem?.imagePath || null
            },
            contentstack: {
                imagePath: d.contentstack?.imagePath || null
            }
        };
    }

    /* ---------------------- Mobile Screenshot ------------------------- */
    if (scan.results?.screenshotMobile?.contentstackMobile?.imagePath) {
        out["screenshot-mobile"] = {
            contentstackMobile: {
                imagePath: scan.results.screenshotMobile.contentstackMobile.imagePath
            }
        };
    }

    /* ---------------------- Text Comparison --------------------------- */
    if (scan.results?.text) {
        out.text = {
            equals: scan.results.text.equals || [],
            missing: scan.results.text.missing || [],
            added: scan.results.text.added || [],
            stats: {
                similarity: scan.results.text.contentParity?.score || 0
            },
            diff: {
                ops: scan.results.text.equals || []
            }
        };
    }

    /* ---------------------- Link Checker ------------------------------ */
    if (scan.results?.links) {
        const lc = scan.results.links;
        out.links = {
            aem: {
                ok: true,
                url: scan.urlOld,
                counts: { total: lc.old.totalLinks },
                score: lc.old.score,
                links: lc.old.allLinks
            },
            contentstack: {
                ok: true,
                url: scan.urlNew,
                counts: { total: lc.new.totalLinks },
                score: lc.new.score,
                links: lc.new.allLinks
            },
            summary: lc.summary
        };
    }

    /* ---------------------- SEO -------------------------------------- */
    if (scan.results?.seo) {
        out.seo = {
            aem: { lighthouse: { score: scan.results.seo.summary.globalScore } },
            contentstack: { lighthouse: { score: scan.results.seo.summary.globalScore } },
            summary: {
                scoreDelta: 0
            }
        };

        out.seoRules = scan.results.seo.rules.map(r => ({
            id: r.id,
            label: r.label,
            old: r.oldValue,
            new: r.newValue,
            score: r.score,
            verdict: r.verdict
        }));
    }

    return out;
}
