// src/steps/visualComparisonDesktopStep.js
import { screenshotCheck } from "../../checks/screenshotCheck.js";

export async function visualComparisonDesktopStep({
    urlOld,
    urlNew,
    metadata,
    checkConfig,
    scanId,
    scanContext
}) {
    try {
        const result = await screenshotCheck(
            {
                aemUrl: urlOld,
                contentstackUrl: urlNew,
                metadata,
                checkConfig,
                scanId,
                scanContext
            },
            { mode: "desktopPair" }
        );

        return {
            status: "ok",
            ...result
        };
    } catch (err) {
        return {
            status: "error",
            error: err.message || "visualComparisonDesktop failed"
        };
    }
}
