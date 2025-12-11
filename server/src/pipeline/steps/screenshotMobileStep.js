// src/steps/screenshotMobileStep.js
import { screenshotCheck } from "../../checks/screenshotCheck.js";

export async function screenshotMobileStep({
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
            { mode: "mobileOnly" }
        );

        return {
            status: "ok",
            ...result
        };
    } catch (err) {
        return {
            status: "error",
            error: err.message || "screenshotMobile failed"
        };
    }
}
