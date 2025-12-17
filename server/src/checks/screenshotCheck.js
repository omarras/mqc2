// src/checks/screenshotCheck.js
import {
  UA_DESKTOP,
  UA_MOBILE,
  TMP_DIR,
  MOBILE_VIEWPORT
} from "../shared/constants.js";
import { setupRouting, gotoFast, takeShot } from "../browser/network.js";
import { prepareForScreenshot } from "../browser/screenshots.js";
import { autoAcceptCookies, hideSelectors } from "../browser/cmp.js";
import { getBrowser } from "../services/browser.service.js";
import { screenshotKey, urlToPath, withNoCacheParam } from "../shared/url-utils.js";
import { Scan } from "../models/Scan.js";

const API_BASE_PATH = process.env.API_BASE_PATH || "/api";

export async function screenshotCheck(
    { aemUrl, contentstackUrl, metadata = {}, scanId, scanContext },
    options = {}
) {
  const logPrefix = "[screenshotCheck]";

  const {
    blockTrackers = true,
    loadBudgetMs = 15000,
    imagesWaitMs = 6000,
    lazyScroll = true,
    waitNetworkIdle = true,
    networkIdleMs = 2000,
    excludes = "",
    mode = "desktopPair"
  } = options || {};

  // Replication skip logic
  const lastReplicationDate = metadata.lastReplicationDate || null;
  const lastShotReplication = metadata.lastScreenshotReplicationDate || null;

  let skipAem = false;
  if (mode === "desktopPair" && lastReplicationDate && lastShotReplication) {
    if (String(lastReplicationDate) === String(lastShotReplication)) {
      skipAem = true;
    }
  }

  // Build no-cache URLs
  const ts = Date.now();
  const aemNoCache = withNoCacheParam(aemUrl, ts);
  const csNoCache  = withNoCacheParam(contentstackUrl, ts);

  const browser = await getBrowser();

  try {
    // ============================================================
    // DESKTOP PAIR MODE
    // ============================================================
    if (mode === "desktopPair") {
      const context = await browser.newContext({
        userAgent: UA_DESKTOP,
        locale: "nl-NL",
        viewport: { width: 1366, height: 900 },
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      context.setDefaultNavigationTimeout(loadBudgetMs);

      try {
        const [oldPage, newPage] = await Promise.all([
          context.newPage(),
          context.newPage()
        ]);

        await Promise.all([
          setupRouting(oldPage, { blockTrackers }),
          setupRouting(newPage, { blockTrackers })
        ]);

        await Promise.all([
          gotoFast(oldPage, aemNoCache, { timeout: loadBudgetMs }),
          gotoFast(newPage, csNoCache,  { timeout: loadBudgetMs })
        ]);

        // Hide selectors
        const hideList = [
          ".truste_box_overlay",
          ".truste_popframe",
          "#onetrust-banner-sdk",
          ".ot-sdk-container",
          "#CybotCookiebotDialog",
          "#CybotCookiebotDialogBody",
          "[data-didomi-popup-open]",
          ".didomi-popup",
          ".cookie-consent",
          "#cookie-consent",
          ".consent-banner"
        ];
        if (excludes) {
          hideList.push(
              ...excludes.split(",").map(s => s.trim()).filter(Boolean)
          );
        }

        await Promise.all([
          autoAcceptCookies(oldPage).catch(() => {}),
          autoAcceptCookies(newPage).catch(() => {})
        ]);

        await Promise.all([
          hideSelectors(oldPage, hideList).catch(() => {}),
          hideSelectors(newPage, hideList).catch(() => {})
        ]);

        await Promise.all([
          prepareForScreenshot(oldPage, { imagesWaitMs, lazyScroll, waitNetworkIdle, networkIdleMs }),
          prepareForScreenshot(newPage, { imagesWaitMs, lazyScroll, waitNetworkIdle, networkIdleMs })
        ]);

        const aemKey = screenshotKey(aemUrl, "aem-desktop");
        const csKey  = screenshotKey(contentstackUrl, "cs-desktop");

        //------------------------------------------------------------
        // 🔥 STEP 9 — VISUAL DIFF SCREENSHOTS
        //------------------------------------------------------------

        // --- OLD PAGE DIFF (MISSING WORDS) ---
        if (!skipAem && scanContext?.highlight?.missingWords?.length > 0) {
          await injectHighlighting(oldPage, scanContext.highlight.missingWords, "rgba(255,0,0,0.35)");
          await takeShot(oldPage, aemKey + "-diff");
        }

        // --- NEW PAGE DIFF (ADDED WORDS) ---
        if (scanContext?.highlight?.addedWords?.length > 0) {
          await injectHighlighting(newPage, scanContext.highlight.addedWords, "rgba(0,200,0,0.35)");
          await takeShot(newPage, csKey + "-diff");
        }

        //------------------------------------------------------------
        // Normal screenshots (no highlighting)
        //------------------------------------------------------------

        let aemResultObj;
        if (skipAem) {
          aemResultObj = {
            url: aemUrl,
            key: aemKey,
            imagePath: `${API_BASE_PATH}/tmp/${aemKey}.png`,
            skipped: true
          };
        } else {
          await takeShot(oldPage, aemKey);
          aemResultObj = {
            url: aemUrl,
            key: aemKey,
            imagePath: `${API_BASE_PATH}/tmp/${aemKey}.png`,
            skipped: false
          };

          if (scanId && lastReplicationDate) {
            await Scan.findByIdAndUpdate(
                scanId,
                { "metadata.lastScreenshotReplicationDate": lastReplicationDate }
            );
          }
        }

        await takeShot(newPage, csKey);

        return {
          note: "desktop comparison complete",
          dir: TMP_DIR,
          aem: aemResultObj,
          contentstack: {
            url: contentstackUrl,
            key: csKey,
            imagePath: `${API_BASE_PATH}/tmp/${csKey}.png`
          }
        };

      } finally {
        await context.close().catch(() => {});
      }
    }

    // ============================================================
    // MOBILE MODE (only NEW page)
    // ============================================================
    if (mode === "mobileOnly") {
      const context = await browser.newContext({
        userAgent: UA_MOBILE,
        locale: "nl-NL",
        viewport: {
          width: MOBILE_VIEWPORT.width,
          height: MOBILE_VIEWPORT.height,
          deviceScaleFactor: MOBILE_VIEWPORT.deviceScaleFactor
        },
        isMobile: MOBILE_VIEWPORT.isMobile,
        hasTouch: MOBILE_VIEWPORT.hasTouch,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      context.setDefaultNavigationTimeout(loadBudgetMs);

      try {
        const page = await context.newPage();

        await setupRouting(page, { blockTrackers });

        await gotoFast(page, csNoCache, { timeout: loadBudgetMs });

        const hideList = [
          ".truste_box_overlay",
          ".truste_popframe",
          "#onetrust-banner-sdk",
          ".ot-sdk-container",
          "#CybotCookiebotDialog",
          "#CybotCookiebotDialogBody",
          "[data-didomi-popup-open]",
          ".didomi-popup",
          ".cookie-consent",
          "#cookie-consent",
          ".consent-banner"
        ];

        await autoAcceptCookies(page).catch(() => {});
        await hideSelectors(page, hideList).catch(() => {});

        await prepareForScreenshot(page, { imagesWaitMs, lazyScroll, waitNetworkIdle, networkIdleMs });

        // STEP 9 — highlight added words on mobile
        if (scanContext?.highlight?.addedWords?.length > 0) {
          await injectHighlighting(page, scanContext.highlight.addedWords, "rgba(0,200,0,0.35)");
        }

        const mobileKey = screenshotKey(contentstackUrl, "cs-mobile");
        await takeShot(page, mobileKey);

        return {
          note: "mobile screenshot complete",
          dir: TMP_DIR,
          contentstackMobile: {
            url: contentstackUrl,
            key: mobileKey,
            imagePath: `${API_BASE_PATH}/tmp/${mobileKey}.png`
          }
        };

      } finally {
        await context.close().catch(() => {});
      }
    }

    throw new Error(`Unsupported screenshot mode: ${mode}`);
  } catch (err) {
    console.error(`${logPrefix} ERROR`, JSON.stringify({
      message: err.message,
      name: err.name,
      stack: err.stack,
      aemUrl,
      contentstackUrl,
      mode
    }));
    throw err;
  }
}
