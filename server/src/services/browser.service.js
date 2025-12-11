// src/services/browser.service.js
import { chromium } from "playwright";

let browser = null;

export async function getBrowser() {
    // If there is no browser yet, or it lost connection, start a new one
    if (!browser || !browser.isConnected()) {
        if (browser) {
            // Just in case, try to close the old one cleanly
            try {
                await browser.close();
            } catch (err) {
                console.warn("[browser.service] error closing old browser:", err.message);
            }
        }

        console.log("[browser.service] launching new Chromium instance...");
        browser = await chromium.launch({
            headless: true,
            args: ["--disable-blink-features=AutomationControlled"]
        });
        console.log("[browser.service] Chromium launched");
    }

    return browser;
}

// Optional manual shutdown hook (e.g. on process exit)
export async function closeBrowser() {
    if (browser) {
        try {
            await browser.close();
            console.log("[browser.service] browser closed");
        } catch (err) {
            console.warn("[browser.service] error closing browser:", err.message);
        } finally {
            browser = null;
        }
    }
}
