import { htmlCheck } from "./htmlCheck.js";
import { textCheck } from "./textCheck.js";
import { linkCheck } from "./linkCheck.js";
import { seoCheck } from "./seoCheck.js";
import { lighthouseCheck } from "./lighthouseCheck.js";
import { visualComparisonDesktopStep } from "./visualComparisonDesktopStep.js";
import { screenshotMobileStep } from "./screenshotMobileStep.js";

export const CHECK_REGISTRY = {
    html: htmlCheck,
    text: textCheck,
    links: linkCheck,
    seo: seoCheck,
    lighthouse: lighthouseCheck,
    visualComparisonDesktop: visualComparisonDesktopStep,
    screenshotMobile: screenshotMobileStep
};
